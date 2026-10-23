"""Optional transcription audit: Python + PyMuPDF; no network or database writes."""
from pathlib import Path
import json
import re
import fitz

catalog = json.loads(Path("data/curriculum/capital-computing-2021.json").read_text())
source = fitz.open(catalog["source"]["file"])
for page_number in range(17, 33):
    # Isolate the course-code column, excluding titles and prerequisite codes.
    text = source[page_number - 1].get_text(
        "text", clip=fitz.Rect(463, 140, 570, 755)
    )
    codes = {
        prefix + " " + number
        for prefix, number in re.findall(
            r"\b(CS|IS|IT|AI|MA|ST|PH|HU)\s*([1-4][0-9]{2})\b", text
        )
    } | {
        prefix + " " + number
        for number, prefix in re.findall(
            r"\b([1-4][0-9]{2})\s*(CS|IS|IT|AI|MA|ST|PH|HU)\b", text
        )
    }
    expected = {
        course["code"]
        for course in catalog["courses"]
        if any(r["page"] == page_number - 3 for r in course["requirements"])
    }
    if codes != expected:
        raise ValueError(f"PDF page {page_number}: missing={expected - codes}, extra={codes - expected}")
print("PASS: all 160 course appearances match the code columns on all 16 PDF table pages.")
