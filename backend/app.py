from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import random
import sys
import pandas as pd
import os
import nltk

nltk.data.path.append('/Users/eason/nltk_data')

app = Flask(__name__)
CORS(app)

AUDIO_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'answer_sentences')

def load_sentences_from_excel():
    """Load sentences from Excel file."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        excel_path = os.path.join(current_dir, '..', 'answer_sentences.xlsx')
        print(f"Trying to load Excel file from: {excel_path}", file=sys.stderr)
        df = pd.read_excel(excel_path)
        print(f"Excel file loaded. Columns: {df.columns.tolist()}", file=sys.stderr)
        print(f"Number of rows: {len(df)}", file=sys.stderr)
        if 'sentence' not in df.columns or 'title' not in df.columns:
            print("Error: 'sentence' or 'title' column not found in Excel file", file=sys.stderr)
            print(f"Available columns: {df.columns.tolist()}", file=sys.stderr)
            return []
        sentences = []
        for _, row in df.iterrows():
            sentence = row['sentence']
            title = row['title']
            print(f"Processing sentence: {sentence}", file=sys.stderr)
            words = nltk.word_tokenize(sentence)
            tagged = nltk.pos_tag(words)
            nouns = [word for word, tag in tagged if tag in ['NN', 'NNS', 'NNP', 'NNPS']]
            print(f"Identified nouns: {nouns}", file=sys.stderr)
            sentences.append({
                "sentence": sentence,
                "title": title,
                "nouns": nouns
            })
        return sentences
    except Exception as e:
        print(f"Error loading Excel file: {e}", file=sys.stderr)
        return []

# Load sentences from Excel
SAMPLE_SENTENCES = load_sentences_from_excel()

# Fallback sentences if Excel file is not available
if not SAMPLE_SENTENCES:
    print("Using fallback sentences", file=sys.stderr)
    SAMPLE_SENTENCES = [
        {
            "sentence": "The cat sat on the mat near the window.",
            "nouns": ["cat", "mat", "window"]
        },
        {
            "sentence": "John bought a new car from the dealership yesterday.",
            "nouns": ["John", "car", "dealership"]
        }
    ]

@app.route('/api/get-random-sentence', methods=['GET'])
def get_random_sentence():
    """Return a random sentence and its nouns."""
    sentence_data = random.choice(SAMPLE_SENTENCES)
    return jsonify({
        'sentence': sentence_data['sentence'],
        'nouns': sentence_data['nouns'],
        'noun_count': len(sentence_data['nouns']),
        'title': sentence_data.get('title', '')
    })

@app.route('/api/check-answers', methods=['POST'])
def check_answers():
    """Check if the user's answers match the nouns in the sentence."""
    data = request.json
    sentence = data.get('sentence')
    user_answers = data.get('answers', [])
    
    # Find the correct nouns for this sentence
    correct_nouns = next(
        (item['nouns'] for item in SAMPLE_SENTENCES if item['sentence'] == sentence),
        []
    )
    
    user_answers = [answer.lower().strip() for answer in user_answers]
    correct_nouns = [noun.lower() for noun in correct_nouns]
    
    # Check if all answers are correct
    is_correct = len(user_answers) == len(correct_nouns) and all(
        answer in correct_nouns for answer in user_answers
    )
    
    return jsonify({
        'is_correct': is_correct,
        'correct_nouns': correct_nouns
    })

@app.route('/audio/<filename>')
def get_audio(filename):
    return send_from_directory(AUDIO_FOLDER, filename)

if __name__ == '__main__':
    print(f"Loaded {len(SAMPLE_SENTENCES)} sentences", file=sys.stderr)
    print("Starting server on port 5001...", file=sys.stderr)
    app.run(host='0.0.0.0', port=5001, debug=True) 