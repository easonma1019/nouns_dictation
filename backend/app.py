from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import random
import sys
import pandas as pd
import os
import spacy
import math

nlp = spacy.load('en_core_web_sm')

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
            test = row['test'] if 'test' in df.columns else 'all'
            cambridge = row['Cambridge'] if 'Cambridge' in df.columns else 'all'
            manual_nouns = row['manual_nouns'] if 'manual_nouns' in df.columns else ''
            # 兼容 NaN
            if isinstance(manual_nouns, str) and manual_nouns.strip():
                nouns = [n.strip() for n in manual_nouns.split(',') if n.strip()]
                print(f"[MANUAL] {title} nouns: {nouns}", file=sys.stderr)
            elif not isinstance(manual_nouns, str) and not (manual_nouns is None or (isinstance(manual_nouns, float) and math.isnan(manual_nouns))):
                # 其他类型且非 NaN，兜底
                nouns = []
                print(f"[MANUAL-EMPTY] {title} nouns: {nouns}", file=sys.stderr)
            else:
                doc = nlp(sentence)
                seen = set()
                nouns = []
                for token in doc:
                    if token.pos_ in ["NOUN", "PROPN"]:
                        key = token.text.strip()
                        if key and key not in seen:
                            nouns.append(token.text.strip())
                            seen.add(key)
                print(f"[AUTO] {title} nouns: {nouns}", file=sys.stderr)
                if title == 'c10t2s4p39':
                    print(f"[DEBUG] c10t2s4p39 final nouns: {nouns}", file=sys.stderr)
            sentences.append({
                "sentence": sentence,
                "title": title,
                "nouns": nouns,
                "test": test,
                "cambridge": cambridge
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

@app.route('/api/all-titles', methods=['GET'])
def get_all_titles():
    print("后端收到 /api/all-titles 请求")
    print("SAMPLE_SENTENCES 中 test 字段的值:", [item.get("test", "all") for item in SAMPLE_SENTENCES], file=sys.stderr)
    titles = [{"title": item["title"], "test": item.get("test", "all"), "cambridge": item.get("cambridge", "all")} for item in SAMPLE_SENTENCES]
    cambridge_groups = list(sorted(set([item.get("cambridge", "all") for item in SAMPLE_SENTENCES])))
    tests_by_cambridge = {}
    for item in SAMPLE_SENTENCES:
        cam = item.get("cambridge", "all")
        t = item.get("test", "all")
        if cam not in tests_by_cambridge:
            tests_by_cambridge[cam] = set()
        tests_by_cambridge[cam].add(t)
    # 转为列表
    tests_by_cambridge = {k: sorted(list(v)) for k, v in tests_by_cambridge.items()}
    return jsonify({"titles": titles, "cambridge_groups": cambridge_groups, "tests_by_cambridge": tests_by_cambridge, "message": "后端正常响应"})

@app.route('/api/titles-by-test', methods=['GET'])
def get_titles_by_test():
    test = request.args.get('test')
    if not test or test == 'all':
        titles = [{"title": item["title"], "test": item.get("test", "all")} for item in SAMPLE_SENTENCES]
    else:
        titles = [{"title": item["title"], "test": item.get("test", "all")} for item in SAMPLE_SENTENCES if item.get("test", "all") == test]
    return jsonify({"titles": titles})

@app.route('/api/get-sentence-by-title', methods=['GET'])
def get_sentence_by_title():
    title = request.args.get('title')
    for item in SAMPLE_SENTENCES:
        if item['title'] == title:
            return jsonify({
                'sentence': item['sentence'],
                'nouns': item['nouns'],
                'noun_count': len(item['nouns']),
                'title': item['title']
            })
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    print(f"Loaded {len(SAMPLE_SENTENCES)} sentences", file=sys.stderr)
    print("Starting server on port 5050...", file=sys.stderr)
    app.run(host='0.0.0.0', port=5050, debug=True) 