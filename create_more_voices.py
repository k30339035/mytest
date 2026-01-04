#!/usr/bin/env python3
"""
다양한 목소리 옵션으로 영어 단어 오디오 생성
"""
import os
from gtts import gTTS

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

# 다양한 영어 억양/지역 옵션
voice_options = [
    ('en', 'com.au', '호주 영어'),      # 호주
    ('en', 'co.uk', '영국 영어'),      # 영국
    ('en', 'us', '미국 영어 (여성)'),   # 미국
    ('en', 'ca', '캐나다 영어'),       # 캐나다
    ('en', 'co.in', '인도 영어'),      # 인도
]

print("=" * 60)
print("다양한 목소리로 영어 단어 학습 오디오 생성 중...")
print("=" * 60)

for lang, tld, description in voice_options:
    print(f"\n[{description}] 생성 중...")

    for idx, (word, korean) in enumerate(words, 1):
        try:
            # 느린 속도 옵션도 추가
            for speed_type, is_slow in [('normal', False), ('slow', True)]:
                tts = gTTS(text=word, lang=lang, tld=tld, slow=is_slow)

                # TLD에서 점 제거하여 파일명 생성
                tld_clean = tld.replace('.', '_')
                filename = f"audio_samples/{idx:02d}_{tld_clean}_{speed_type}_{word.replace(' ', '_')}.mp3"

                tts.save(filename)

            print(f"✓ {idx}. {word} ({korean})")

        except Exception as e:
            print(f"✗ {idx}. {word} 생성 실패: {e}")

print("\n" + "=" * 60)
print("완료! audio_samples 폴더에 다양한 목소리 샘플이 있습니다.")
print("=" * 60)
print("\n파일명 형식:")
print("  번호_억양_속도_단어.mp3")
print("  예: 01_co_uk_normal_apple.mp3 (영국 영어, 보통 속도)")
print("      01_co_uk_slow_apple.mp3 (영국 영어, 느린 속도)")
