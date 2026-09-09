"""List all models this API key actually has access to, and which support generateContent."""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

print("Models available to your API key:\n")
for model in genai.list_models():
    if "generateContent" in model.supported_generation_methods:
        print(f"  {model.name}")