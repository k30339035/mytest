#!/usr/bin/env python3
"""
8살 아이를 위한 영어 단어 학습 오디오 파일 생성기
"""
import os
from gtts import gTTS
import pyttsx3

# 8살 아이에게 적합한 영어 단어 리스트
words = [
    ("apple", "사과"),
    ("ball", "공"),
    ("cat", "고양이"),
    ("dog", "개"),
    ("elephant", "코끼리"),
    ("fish", "물고기"),
    ("house", "집"),
    ("ice cream", "아이스크림"),
    ("jump", "점프하다"),
    ("kite", "연")
]

# 출력 디렉토리 생성
os.makedirs("audio_samples", exist_ok=True)

print("=" * 60)
print("8살 아이를 위한 영어 단어 학습 오디오 파일 생성 중...")
print("=" * 60)

# 방법 1: gTTS (Google Text-to-Speech) - 인터넷 필요
print("\n[방법 1] Google TTS로 생성 중...")
for idx, (word, korean) in enumerate(words, 1):
    try:
        # 영어 단어 음성 생성
        tts = gTTS(text=word, lang='en', slow=False)
        filename = f"audio_samples/{idx:02d}_gtts_{word.replace(' ', '_')}.mp3"
        tts.save(filename)
        print(f"✓ {idx}. {word} ({korean}) - {filename}")
    except Exception as e:
        print(f"✗ {idx}. {word} 생성 실패: {e}")

# 방법 2: pyttsx3 (로컬 TTS 엔진)
print("\n[방법 2] 로컬 TTS로 다양한 목소리 생성 중...")
try:
    engine = pyttsx3.init()

    # 사용 가능한 목소리 확인
    voices = engine.getProperty('voices')
    print(f"\n사용 가능한 목소리: {len(voices)}개")

    # 목소리별로 샘플 생성
    for voice_idx, voice in enumerate(voices[:2]):  # 처음 2개 목소리만 테스트
        print(f"\n목소리 {voice_idx + 1}: {voice.name}")
        engine.setProperty('voice', voice.id)

        # 속도 조정 (아이들을 위해 약간 느리게)
        engine.setProperty('rate', 150)  # 기본값보다 느림

        for idx, (word, korean) in enumerate(words, 1):
            try:
                filename = f"audio_samples/{idx:02d}_local_voice{voice_idx+1}_{word.replace(' ', '_')}.mp3"
                engine.save_to_file(word, filename)
                print(f"  ✓ {idx}. {word} ({korean})")
            except Exception as e:
                print(f"  ✗ {idx}. {word} 실패: {e}")

        engine.runAndWait()

except Exception as e:
    print(f"로컬 TTS 초기화 실패: {e}")
    print("pyttsx3는 일부 시스템에서 음성 엔진이 필요할 수 있습니다.")

print("\n" + "=" * 60)
print("완료! audio_samples 폴더를 확인해주세요.")
print("=" * 60)
