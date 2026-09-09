"""
Table-preserving HTML to chunks conversion.

Regular BeautifulSoup .get_text() flattens HTML tables into a meaningless
jumble of numbers with no row/column structure. This module instead walks
the document and converts each <table> into a clean Markdown table (rows
and columns preserved), while everything else becomes plain paragraph text.

Tables are kept as their own dedicated chunks (never split mid-table),
tagged with is_table=True in metadata, so financial data can be retrieved
and quoted accurately instead of reconstructed from flattened text.
"""

import re
from bs4 import BeautifulSoup, NavigableString

NARRATIVE_CHUNK_SIZE = 1000
NARRATIVE_CHUNK_OVERLAP = 150
MAX_TABLE_ROWS_PER_CHUNK = 40


def _table_to_markdown(table_tag):
    rows = []
    for tr in table_tag.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        cell_texts = [re.sub(r"\s+", " ", cell.get_text(separator=" ").strip()) for cell in cells]
        if any(cell_texts):
            rows.append(cell_texts)

    if not rows:
        return ""

    max_cols = max(len(r) for r in rows)
    rows = [r + [""] * (max_cols - len(r)) for r in rows]

    lines = []
    for i, row in enumerate(rows):
        lines.append("| " + " | ".join(row) + " |")
        if i == 0:
            lines.append("|" + "---|" * max_cols)

    return "\n".join(lines)


def _split_table_markdown(markdown, max_rows):
    lines = markdown.split("\n")
    if len(lines) <= 2:
        return [markdown]

    header = lines[0]
    separator = lines[1]
    data_rows = lines[2:]

    chunks = []
    for i in range(0, len(data_rows), max_rows):
        chunk_rows = data_rows[i:i + max_rows]
        chunks.append("\n".join([header, separator] + chunk_rows))
    return chunks


def html_to_blocks(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    for tag in soup(["script", "style", "head", "meta", "link"]):
        tag.decompose()

    blocks = []
    narrative_buffer = []

    def flush_narrative():
        if narrative_buffer:
            text = " ".join(narrative_buffer)
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                blocks.append({"text": text, "is_table": False})
            narrative_buffer.clear()

    def walk(node):
        for child in node.children:
            if getattr(child, "name", None) == "table":
                flush_narrative()
                markdown = _table_to_markdown(child)
                if markdown.strip():
                    blocks.append({"text": markdown, "is_table": True})
            elif hasattr(child, "children"):
                walk(child)
            else:
                text = str(child).strip()
                if text:
                    narrative_buffer.append(text)

    walk(soup)
    flush_narrative()
    return blocks


def blocks_to_chunks(blocks):
    chunks = []
    narrative_accum = ""

    def flush_narrative_accum():
        nonlocal narrative_accum
        if not narrative_accum:
            return
        start = 0
        while start < len(narrative_accum):
            chunks.append({
                "text": narrative_accum[start:start + NARRATIVE_CHUNK_SIZE],
                "is_table": False,
            })
            start += NARRATIVE_CHUNK_SIZE - NARRATIVE_CHUNK_OVERLAP
        narrative_accum = ""

    for block in blocks:
        if block["is_table"]:
            flush_narrative_accum()
            table_chunks = _split_table_markdown(block["text"], MAX_TABLE_ROWS_PER_CHUNK)
            for tc in table_chunks:
                chunks.append({"text": tc, "is_table": True})
        else:
            narrative_accum += (" " if narrative_accum else "") + block["text"]

    flush_narrative_accum()
    return chunks


def html_to_chunks(html_content):
    blocks = html_to_blocks(html_content)
    return blocks_to_chunks(blocks)
