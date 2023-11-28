from deep_translator import GoogleTranslator, ChatGptTranslator

def auto_detect_translate(term):
    translated = GoogleTranslator(source="auto",target='en').translate(text=term)
    return translated
