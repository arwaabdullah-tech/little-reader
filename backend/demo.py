"""Ready-made content for presenting: Sara's day, a backup story (used only if the AI is unreachable
and DEMO_MODE=1), and sample history so the parent dashboard is never empty on stage.
[masculine|feminine] pairs are resolved by the child's gender; {n} is the child's name."""
import re

DAY = {
    'ar': ['رحت الحديقة مع أبوي ولعبنا كورة!', 'طحت وعوّرت ركبتي… بس ما بكيت!', 'إيه! أختي الصغيرة ساعدتني!'],
    'en': ['I went to the park with Dad and we played football!', "I fell and hurt my knee… but I didn't cry!", 'Yes! My little sister helped me!'],
}

_GENDER = re.compile(r'\[([^\[\]|]*)\|([^\[\]]*)\]')


def gx(text: str, gender: str, name: str = '') -> str:
    return _GENDER.sub(lambda m: m.group(1) if gender == 'm' else m.group(2), text).replace('{n}', name)


# Each page: scene, props, narration (parent), child lines for reading levels 1-3 (level 4 reads the whole page),
# and a true "did you know?" fact so every story teaches something new.
_AR_PAGES = [
    ('park', ['⚽'], 'في يومٍ مشمس، ~[ذهب|ذهبت]~ {n} إلى الحديقة مع ~[أبيه|أبيها]~.',
     ['~الكرة~!', 'لعبنا ~بالكرة~ معًا!', 'لعبنا ~بالكرة~ معًا! [وركضتُ|وركضتُ] بسرعة كبيرة.'],
     'كرة القدم أكثر رياضة يلعبها الناس في العالم، ويلعبها مئات الملايين في كل القارات.'),
    ('fall', ['🩹'], '[ركض|ركضت] {n} بسرعة… ثم ~[وقع|وقعت]~ ~[وجُرحت ركبته|وجُرحت ركبتها]~.',
     ['لم أبكِ!', '~لكنني~ لم أبكِ!', '~لكنني~ لم أبكِ! ونهضتُ من جديد.'],
     'عندما تُجرح الركبة يصنع الجسم قشرة صغيرة تحمي الجرح، وتحتها ينمو جلد جديد خلال أيام.'),
    ('brave', ['💛'], '[ابتسم أبوه|ابتسم أبوها] وقال: «الشجاعُ يتألّم… ثم ينهضُ من جديد.»',
     ['[أنا شجاع!|أنا شجاعة!]', '[أنا شجاع!|أنا شجاعة!]', '[أنا شجاع!|أنا شجاعة!] سأنهض دائمًا.'],
     'عندما نخاف أو نركض ينبض القلب أسرع، والنفَس العميق البطيء يساعده على الهدوء.'),
    ('sister', ['🤍'], 'وفي البيت، جاءت [أختُه|أختُها] الصغيرة ومسحت على ركبته[|ا] بلطف.',
     ['شكرًا!', 'شكرًا يا أختي الصغيرة!', 'شكرًا يا أختي! أنتِ لطيفة جدًا.'],
     'الهدهد طائر له تاج من الريش يفتحه كالمروحة، وقد ذُكر في القرآن الكريم في سورة النمل.'),
    ('night', ['🌙'], 'وفي الليل، [ابتسم|ابتسمت] {n}. كان يومًا فيه ركبةٌ مجروحة… وقلبٌ كبير.',
     ['تصبحون على خير!', 'تصبحون على خير يا أهلي!', 'كان يومًا جميلًا. تصبحون على خير!'],
     'في أثناء النوم يعمل الجسم على النمو وإصلاح الجروح، لذلك يحتاج الأطفال إلى نوم طويل كل ليلة.'),
]
_EN_PAGES = [
    ('park', ['⚽'], 'On a sunny day, {n} went to the park with [his|her] dad.',
     ['Football!', 'We played football together!', 'We played football together! I ran so fast.'],
     'Football is the most played sport in the world: hundreds of millions of people play it on every continent.'),
    ('fall', ['🩹'], '{n} ran fast… then [he|she] fell and scraped [his|her] knee.',
     ["I didn't cry!", "But I didn't cry!", "But I didn't cry! I got up again."],
     'When you scrape your knee, your body makes a scab to protect it while new skin grows underneath.'),
    ('brave', ['💛'], '[His|Her] dad smiled: "Brave people get hurt… then they stand up again."',
     ['I am brave!', 'I am brave!', 'I am brave! I will always get up.'],
     'When we are scared or running, our heart beats faster. Slow, deep breaths help it calm down.'),
    ('sister', ['🤍'], 'At home, [his|her] little sister gently patted [his|her] knee.',
     ['Thank you!', 'Thank you, little sister!', 'Thank you, little sister! You are so kind.'],
     'The hoopoe has a crown of feathers it can open like a fan.'),
    ('night', ['🌙'], 'At night, {n} smiled. It was a day with a scraped knee… and a big heart.',
     ['Good night!', 'Good night, everyone!', 'It was a good day. Good night, everyone!'],
     'While you sleep, your body grows and repairs cuts and scrapes. That is why children need lots of sleep.'),
]


def backup_story(name: str, gender: str, lang: str, level: int, answers: list[str]) -> dict:
    """The demo story (Sara's day), personalised with name, gender and ladder step."""
    ar = lang == 'ar'
    pages = []
    for scene, props, narration, lines, fact in (_AR_PAGES if ar else _EN_PAGES):
        n = gx(narration, gender, name)
        if level >= 4:
            pages.append({'scene': scene, 'props': props, 'narration': '', 'child_line': n + ' ' + gx(lines[1], gender, name), 'fact': fact})
        else:
            pages.append({'scene': scene, 'props': props, 'narration': n, 'child_line': gx(lines[max(0, level - 1)], gender, name), 'fact': fact})
    return {
        'title': gx('يوم {n} الشجاع' if ar else "{n}'s Brave Day", gender, name),
        'pages': pages,
        'bridges': [['رحت', gx('[ذهب|ذهبت]', gender)], ['أبوي', gx('[أبيه|أبيها]', gender)], ['كورة', 'الكرة'],
                    ['طحت', gx('[وقع|وقعت]', gender)], ['عوّرت', gx('[وجُرحت ركبته|وجُرحت ركبتها]', gender)], ['بس', 'لكنني']] if ar else [],
        'words': ['ذهبت', 'وقعت', 'الكرة'] if ar else ['scraped', 'brave', 'gently'],
        'mission': gx('[اطلب|اطلبي] من أختك أن [تساعدها أنتَ|تساعديها أنتِ] في شيء صغير.' if ar
                      else 'Ask your sister if you can help HER with something small.', gender, name),
        'parent_question': gx('«[كيف شعرتَ عندما وقعت؟|كيف شعرتِ عندما وقعتِ؟] وما الذي ساعدك؟»' if ar
                              else '"How did you feel when you fell? What helped you?"', gender, name),
        'feelings': [['😊', 'الحديقة مع أبي' if ar else 'The park with Dad'], ['😣', 'السقوط' if ar else 'Falling down'],
                     ['💛', gx('[أخته|أختها] [ساعدته|ساعدتها]', gender) if ar else 'Sister helped']],
        'facts': [p['fact'] for p in pages],
        'said': answers,
    }


# Words that always stop story writing, even without the AI (the AI safety check runs first when available).
_WORRY = re.compile(
    r'يضربني|يضربوني|ضربني|يؤذيني|لمسني|سر خطير|لا تخبر|أبي أموت|ابي اموت|أقتل|انتحار|'
    r'hits? me|hurts? me|touched me|keep (it|a) secret|kill myself|want to die|hurt myself', re.I)


def worrying(answers: list[str]) -> bool:
    return any(_WORRY.search(a or '') for a in answers)


# Sample history for the parent dashboard while presenting (marked as sample in the UI).
SAMPLE_NIGHTS = [2, 3, 3, None, 4, 5, 6, 6, 7, None, 8, 9, 10]   # words read alone, 13 nights before tonight
SAMPLE_WORDS = {'ar': ['أبي', 'الكرة', 'لكن', 'حذاء', 'ذهبت', 'وقعت', 'جميل', 'مسرور', 'سريعًا', 'الحديقة', 'صديقي', 'نهضت'],
                'en': ['scraped', 'brave', 'gently', 'whisper', 'gigantic', 'giggle']}
SAMPLE_WEEK = {'ar': [['😊', 'يوم البحر'], ['😴', 'تعب'], ['🤝', 'صديق جديد'], ['💛', 'ساعد أخته'], ['🥳', 'عيد ميلاد'], ['😤', 'خلاف على لعبة']],
               'en': [['😊', 'Beach day'], ['😴', 'Tired'], ['🤝', 'New friend'], ['💛', 'Helped sister'], ['🥳', 'Birthday party'], ['😤', 'Fight over toys']]}
SAMPLE_BOOKS = 23        # books already on the demo shelf, so tonight's is book #24
SAMPLE_MINUTES = 11
SAMPLE_WORDS_COUNT = 34
SAMPLE_FACTS_COUNT = 62   # "did you know?" facts in the 23 sample books
