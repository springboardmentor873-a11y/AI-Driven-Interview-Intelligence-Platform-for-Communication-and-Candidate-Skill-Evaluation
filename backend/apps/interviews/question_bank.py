"""Fallback questions used when Gemini is not available.

Each entry is (level, category, text). Level is the difficulty the question
suits, so a request for "hard" prefers hard entries and fills up from the rest.
"""

HR = [
    ("easy", "Background", "Tell me about yourself and your background."),
    ("easy", "Motivation", "Why are you interested in this field?"),
    ("easy", "Strengths", "What are your biggest strengths, and how have they helped you?"),
    ("easy", "Goals", "What are you looking for in your first role?"),
    ("medium", "Self-awareness", "What is one weakness you are working on, and what are you doing about it?"),
    ("medium", "Goals", "Where do you see yourself in five years?"),
    ("medium", "Work style", "What kind of team or work environment helps you do your best work?"),
    ("medium", "Achievement", "Tell me about a goal you set and how you achieved it."),
    ("hard", "Pressure", "How do you handle pressure and tight deadlines? Give a real example."),
    ("hard", "Decision making", "Why should we hire you over other equally qualified candidates?"),
    ("hard", "Self-awareness", "Tell me about a decision you regret and what it taught you."),
    ("hard", "Career", "What would make you leave a job within the first year?"),
]

BEHAVIORAL = [
    ("easy", "Learning", "Give an example of a time you had to learn something new quickly."),
    ("easy", "Teamwork", "Tell me about a time you worked well in a team. What was your role?"),
    ("easy", "Initiative", "Give an example of a time you went beyond what was asked of you."),
    ("medium", "Leadership", "Tell me about a time you took the lead on a project. How did it go?"),
    ("medium", "Communication", "Describe a time you had to explain something complex to someone without a technical background."),
    ("medium", "Prioritising", "Tell me about a time you had to handle several tasks at once. How did you prioritise?"),
    ("medium", "Feedback", "Tell me about a time you received critical feedback. How did you respond?"),
    ("hard", "Conflict", "Tell me about a time you disagreed with a teammate. How did you resolve it?"),
    ("hard", "Failure", "Describe a time you failed at something. What did you learn from it?"),
    ("hard", "Deadlines", "Describe a time you missed a deadline or came close to it. What did you do?"),
    ("hard", "Ethics", "Tell me about a time you were pressured to cut a corner. What did you do?"),
]

APTITUDE = [
    ("easy", "Quantitative", "A shirt costs 800 rupees and is sold at a 25 percent discount. What is the selling price?"),
    ("easy", "Quantitative", "If 5 pens cost 60 rupees, how much do 8 pens cost?"),
    ("easy", "Logical", "Find the next number in the series 3, 6, 12, 24, and explain the pattern."),
    ("easy", "Logical", "All roses are flowers, and some flowers fade quickly. Can we conclude that some roses fade quickly? Explain."),
    ("easy", "Quantitative", "A train 120 metres long crosses a pole in 6 seconds. What is its speed in kilometres per hour?"),
    ("medium", "Quantitative", "Two numbers are in the ratio 3 to 5 and their sum is 96. What are the two numbers?"),
    ("medium", "Quantitative", "A can finish a job in 12 days and B can finish it in 18 days. How many days will they take working together?"),
    ("medium", "Logical", "Find the next number in the series 2, 6, 12, 20, 30, and explain the pattern."),
    ("medium", "Quantitative", "A sum of money doubles in 8 years at simple interest. In how many years will it become three times the original?"),
    ("medium", "Reasoning", "In a group of 100 people, 60 speak English, 45 speak Hindi and 20 speak both. How many speak neither?"),
    ("medium", "Quantitative", "The average of five numbers is 24. When one number is removed, the average of the other four becomes 22. What number was removed?"),
    ("hard", "Quantitative", "A boat covers 24 km upstream and 24 km back downstream in 5 hours in total. If the stream flows at 2 km per hour, what is the boat's speed in still water?"),
    ("hard", "Logical", "You have 8 identical-looking coins and one is heavier. Using a balance scale, what is the minimum number of weighings needed to find it, and how?"),
    ("hard", "Reasoning", "A clock shows 3:15. What is the angle between the hour hand and the minute hand?"),
    ("hard", "Logical", "Three switches outside a closed room control three bulbs inside. You may enter the room only once. How do you work out which switch controls which bulb?"),
    ("hard", "Quantitative", "The price of an item is increased by 20 percent and then decreased by 20 percent. What is the net change in price?"),
    ("hard", "Reasoning", "How many times do the hour hand and the minute hand of a clock overlap in a 12-hour period?"),
]

# Technical questions that do not depend on the resume
TECHNICAL_GENERIC = [
    ("easy", "Fundamentals", "What is the difference between a stack and a queue? Give a real use for each."),
    ("easy", "Fundamentals", "Explain time complexity and space complexity with a simple example."),
    ("easy", "Databases", "What is a primary key, and why do tables need one?"),
    ("medium", "Web", "What is a REST API, and how does it differ from a WebSocket connection?"),
    ("medium", "Databases", "What is database indexing, and when can an index make things slower?"),
    ("medium", "Fundamentals", "Explain the difference between processes and threads."),
    ("hard", "System design", "How would you design a URL shortener? Talk about storage, scaling and failure cases."),
    ("hard", "System design", "How would you design a rate limiter for a public API?"),
    ("hard", "Concurrency", "What is a race condition, and how would you find and fix one in a real system?"),
]

# Technical questions built around one skill or technology from the resume
TECHNICAL_TEMPLATES = {
    "easy": [
        "What is {t}, and what have you used it for?",
        "Explain one basic concept in {t} that you use often.",
        "How did you first learn {t}, and what did you build with it?",
    ],
    "medium": [
        "Describe a project where you used {t}. What design decisions did you make and why?",
        "What are common mistakes when working with {t}, and how do you avoid them?",
        "How do you test and debug code that relies on {t}?",
    ],
    "hard": [
        "How would you design a production system around {t} that must handle ten times more traffic? What would you change first?",
        "What are the main limitations of {t}, and when would you choose an alternative?",
        "Walk me through how you would diagnose a serious performance problem in a {t} application.",
    ],
}
DOMAIN_TEMPLATE = "How would you apply {t} to a problem in {d}?"

# HR and behavioral questions that use the resume. {x} reads like "as ML Intern at Acme"
EXPERIENCE_HR = "Tell me about your experience {x}. What did you enjoy most, and what would you do differently now?"
EXPERIENCE_BEHAVIORAL = "Tell me about the hardest problem you faced in your experience {x}. How did you handle it?"
