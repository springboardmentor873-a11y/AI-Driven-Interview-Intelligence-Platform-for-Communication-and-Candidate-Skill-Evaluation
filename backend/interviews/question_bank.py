"""Curated interview questions used when AI is off or fails.

Each entry is (question, [expected topics]). Every list goes from easier to harder.
"""

HR = [
    ('Tell me about yourself.', ['education', 'skills', 'experience', 'career goals']),
    ('Why are you interested in this role?', ['motivation', 'company or field knowledge', 'fit with skills']),
    ('What are your greatest strengths and one weakness you are working on?', ['honest self-awareness', 'examples', 'improvement plan']),
    ('Where do you see yourself in five years?', ['realistic goals', 'learning', 'growth with the company']),
    ('Why should we hire you instead of other candidates?', ['relevant skills', 'proof or examples', 'value to the team']),
    ('How do you handle pressure and tight deadlines?', ['prioritising', 'staying calm', 'a real example']),
    ('How would you handle a disagreement with your manager about how to do a task?', ['listening', 'respectful communication', 'finding a solution']),
]

BEHAVIORAL = [
    ('Describe a time you worked well in a team.', ['your role', 'collaboration', 'result']),
    ('Tell me about a time you learned something new quickly.', ['situation', 'learning method', 'outcome']),
    ('Describe a mistake you made and what you learned from it.', ['ownership', 'fix', 'lesson learned']),
    ('Tell me about a time you had to meet a difficult deadline.', ['planning', 'actions taken', 'result']),
    ('Describe a conflict with a teammate and how you resolved it.', ['situation', 'communication', 'resolution']),
    ('Tell me about a time you led others or took initiative.', ['initiative', 'actions', 'impact']),
    ('Describe a time you failed to reach a goal. What did you do next?', ['honesty', 'recovery', 'change in approach']),
]

APTITUDE = [
    ('If 5 machines make 5 items in 5 minutes, how long do 100 machines take to make 100 items? Explain your steps.', ['rate per machine', '5 minutes']),
    ('What is the next number in the series 2, 6, 12, 20, 30? Explain the pattern.', ['differences increase by 2', '42']),
    ('A train 120 m long passes a pole in 6 seconds. What is its speed in km/h?', ['speed = distance / time', '20 m/s', '72 km/h']),
    ('A price goes up by 20% and then down by 20%. What is the net change?', ['successive percentages', '4% decrease']),
    ('Two pipes fill a tank in 12 hours and 15 hours. How long do they take together?', ['combined rate', '6 hours 40 minutes']),
    ('Two dice are rolled. What is the probability that the sum is 8?', ['36 outcomes', '5 favourable outcomes', '5/36']),
    ('What is the angle between the hour and minute hands of a clock at 3:40?', ['hour hand moves 0.5 degrees per minute', 'minute hand 6 degrees per minute', '130 degrees']),
]

TECHNICAL = {
    'python': [
        ('What is the difference between a list and a tuple in Python?', ['mutable vs immutable', 'use cases', 'performance']),
        ('What are *args and **kwargs used for?', ['variable arguments', 'positional vs keyword', 'example']),
        ('What is a decorator and when would you use one?', ['functions as objects', 'wrapping behaviour', 'logging or auth example']),
        ('What is the difference between a list comprehension and a generator?', ['memory use', 'lazy evaluation', 'iteration']),
        ('What is the GIL and how does it affect threads?', ['one thread at a time', 'CPU vs I/O work', 'multiprocessing']),
        ('How does Python manage memory and garbage collection?', ['reference counting', 'cyclic garbage collector', 'memory leaks']),
    ],
    'java': [
        ('What is the difference between JDK, JRE and JVM?', ['development kit', 'runtime', 'virtual machine']),
        ('Explain the four pillars of object-oriented programming with Java examples.', ['encapsulation', 'inheritance', 'polymorphism', 'abstraction']),
        ('What is the difference between an abstract class and an interface?', ['multiple inheritance', 'default methods', 'when to use each']),
        ('What is the difference between == and equals(), and why does hashCode matter?', ['reference vs value', 'equals-hashCode contract', 'collections']),
        ('How does a HashMap work internally?', ['hashing', 'buckets', 'collisions', 'resizing']),
        ('Explain multithreading, synchronization and how a deadlock happens.', ['threads', 'locks', 'deadlock conditions', 'prevention']),
    ],
    'web development': [
        ('What happens when you type a web address into a browser?', ['DNS', 'HTTP request', 'HTML, CSS and JS loading']),
        ('What is the difference between GET and POST requests?', ['data in URL vs body', 'idempotency', 'use cases']),
        ('Explain the CSS box model and how Flexbox helps with layout.', ['content, padding, border, margin', 'flex container', 'alignment']),
        ('What is a REST API and which HTTP status codes do you commonly use?', ['resources and verbs', '200, 201, 400, 404, 500', 'statelessness']),
        ('What is CORS and why does the browser enforce it?', ['same-origin policy', 'headers', 'security reason']),
        ('How do you protect a web application from XSS and CSRF attacks?', ['input escaping', 'tokens', 'secure cookies', 'content security policy']),
    ],
    'sql': [
        ('What is the difference between a primary key and a foreign key?', ['uniqueness', 'relationships between tables', 'integrity']),
        ('What is the difference between INNER JOIN and LEFT JOIN?', ['matching rows', 'unmatched rows with NULL', 'example']),
        ('What is the difference between WHERE and HAVING?', ['filtering rows', 'filtering groups', 'GROUP BY']),
        ('What is normalization and why is it used?', ['reducing duplication', '1NF, 2NF, 3NF', 'trade-offs']),
        ('What is an index and what are its trade-offs?', ['faster reads', 'slower writes', 'storage cost', 'when to add one']),
        ('What are ACID properties and transaction isolation levels?', ['atomicity, consistency, isolation, durability', 'dirty reads', 'isolation levels']),
    ],
    'data structures': [
        ('What is the difference between an array and a linked list?', ['memory layout', 'access time', 'insert and delete cost']),
        ('Explain stacks and queues and give a real use for each.', ['LIFO', 'FIFO', 'examples']),
        ('How does a hash table work and how are collisions handled?', ['hash function', 'chaining', 'open addressing', 'average O(1)']),
        ('What is the difference between BFS and DFS, and when would you use each?', ['queue vs stack', 'shortest path', 'memory use']),
        ('Why does binary search need sorted data, and what is its time complexity?', ['halving the search space', 'O(log n)', 'sorted requirement']),
        ('What is a heap or a balanced binary search tree, and when is it better than a plain array?', ['ordering rules', 'O(log n) operations', 'priority queue or lookups']),
    ],
    'react': [
        ('What is JSX and what is a React component?', ['JSX syntax', 'reusable UI pieces', 'function components']),
        ('What is the difference between props and state?', ['read-only vs local data', 'data flow', 'example']),
        ('How do the useState and useEffect hooks work?', ['state updates', 'side effects', 'dependency array']),
        ('Why do list items need a key in React?', ['stable identity', 'reconciliation', 'avoid index keys when order changes']),
        ('What is the difference between controlled and uncontrolled inputs, and when would you use Context?', ['state-driven values', 'refs', 'avoiding prop drilling']),
        ('How can you avoid unnecessary re-renders in a React app?', ['React.memo', 'useMemo and useCallback', 'state placement']),
    ],
    'django': [
        ('What is the MVT architecture in Django?', ['model', 'view', 'template', 'URL routing']),
        ('What are Django models and migrations?', ['tables as classes', 'makemigrations and migrate', 'schema changes']),
        ('What is the difference between ForeignKey, OneToOneField and ManyToManyField?', ['relationship types', 'examples', 'on_delete']),
        ('What is middleware in Django and can you give an example?', ['request and response hooks', 'authentication or CORS', 'order']),
        ('What is the N+1 query problem and how do select_related and prefetch_related fix it?', ['extra queries', 'joins vs separate lookups', 'when to use each']),
        ('How do Django REST Framework serializers, permissions and authentication work together?', ['validation and conversion', 'who can access', 'who you are', 'per-object filtering']),
    ],
}

# Other names a user might type -> the domain above.
DOMAIN_ALIASES = {
    'python': 'python',
    'python3': 'python',
    'java': 'java',
    'core java': 'java',
    'web development': 'web development',
    'web': 'web development',
    'web dev': 'web development',
    'frontend': 'web development',
    'front end': 'web development',
    'backend': 'web development',
    'full stack': 'web development',
    'fullstack': 'web development',
    'javascript': 'web development',
    'js': 'web development',
    'typescript': 'web development',
    'html': 'web development',
    'css': 'web development',
    'node': 'web development',
    'node.js': 'web development',
    'nodejs': 'web development',
    'sql': 'sql',
    'mysql': 'sql',
    'postgresql': 'sql',
    'postgres': 'sql',
    'sqlite': 'sql',
    'database': 'sql',
    'databases': 'sql',
    'dbms': 'sql',
    'data structures': 'data structures',
    'data structure': 'data structures',
    'dsa': 'data structures',
    'algorithms': 'data structures',
    'react': 'react',
    'reactjs': 'react',
    'react.js': 'react',
    'django': 'django',
    'django rest framework': 'django',
    'drf': 'django',
}

CATEGORY_POOLS = {
    'hr': HR,
    'behavioral': BEHAVIORAL,
    'aptitude': APTITUDE,
}

# Shown in the frontend datalist later.
TECHNICAL_DOMAINS = list(TECHNICAL)
