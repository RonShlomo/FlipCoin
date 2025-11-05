from fastapi import FastAPI
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import re

app = FastAPI()

local_dir = "models/TinyLlama_TinyLlama-1.1B-Chat-v1.0"
tokenizer = AutoTokenizer.from_pretrained(local_dir)
model = AutoModelForCausalLM.from_pretrained(local_dir)

pipe = pipeline("text-generation", model=model, tokenizer=tokenizer, device_map="cpu")

def clean_output(text):
    output = text.strip()
    output = re.sub(r"^\s*\d+[\.\)]\s*", "", output)
    output = re.sub(r"(\.\s*)\d+[\.\)]\s*", r"\1", output)
    output = re.sub(r"^(?:sure|certainly|of course|here'?s|well|okay|ok)[,!\s:;-]+", "", output, flags=re.I)
    if ":" in output and len(output.split(":")[0]) < len(output):
        output = output.split(":", 1)[1].strip()
    first_sentence = output.split(".")[0]
    if len(first_sentence) > 10:
        output = first_sentence + "."
    return output

@app.get("/insight")
def get_insight():
    print("📩 Received new request for insight")
    prompt = """
### System:
You are a professional crypto trader. Respond with one concise sentence under 25 words.
### User:
Give one actionable crypto trading insight.
### Assistant:
"""
    result = pipe(prompt, max_new_tokens=100, do_sample=True, temperature=0.6, repetition_penalty=1.25)
    text = result[0]["generated_text"].split("### Assistant:")[-1].strip()
    return {"tip": clean_output(text)}
