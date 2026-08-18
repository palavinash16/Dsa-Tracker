from pathlib import Path


TAG_CATEGORY_MAP = {
    "array": "Arrays",
    "arrays": "Arrays",
    "hash": "Hash_Table",
    "hashing": "Hash_Table",
    "hash table": "Hash_Table",
    "string": "Strings",
    "strings": "Strings",
    "dynamic programming": "Dynamic_Programming",
    "dp": "Dynamic_Programming",
    "graph": "Graphs",
    "graphs": "Graphs",
    "depth first search": "Graphs",
    "depth-first search": "Graphs",
    "dfs": "Graphs",
    "breadth first search": "Graphs",
    "breadth-first search": "Graphs",
    "bfs": "Graphs",
    "tree": "Trees",
    "trees": "Trees",
    "binary tree": "Trees",
    "binary search tree": "Trees",
    "greedy": "Greedy",
    "sliding window": "Sliding_Window",
    "two pointers": "Two_Pointers",
    "linked list": "Linked_List",
    "stack": "Stack",
    "queue": "Queue",
    "heap": "Heap",
    "priority queue": "Heap",
    "binary search": "Binary_Search",
    "backtracking": "Backtracking",
    "recursion": "Recursion",
    "matrix": "Matrix",
    "math": "Math",
    "number theory": "Math",
    "sorting": "Sorting",
    "prefix sum": "Prefix_Sum",
    "bit manipulation": "Bit_Manipulation",
    "trie": "Trie",
}


TITLE_CATEGORY_RULES = [
    ("Linked_List", ["linked list", "list node", "node", "cycle"]),
    ("Stack", ["stack", "valid parentheses", "next greater", "previous greater", "histogram"]),
    ("Queue", ["queue", "deque", "sliding window maximum"]),
    ("Trees", ["tree", "bst", "binary search tree", "binary tree", "root", "leaf", "inorder", "preorder", "postorder", "traversal"]),
    ("Graphs", ["graph", "island", "bfs", "dfs", "path", "connected", "cycle detection"]),
    ("Dynamic_Programming", ["dp", "dynamic", "ways", "minimum cost", "maximum sum", "coin change"]),
    ("Binary_Search", ["binary search", "search in rotated", "lower bound", "upper bound"]),
    ("Hash_Table", ["hash", "frequency", "map", "count pairs"]),
    ("Sorting", ["sort", "sorted", "merge intervals"]),
    ("Heap", ["heap", "kth", "priority queue", "top k"]),
    ("Math", ["prime", "factor", "gcd", "lcm", "number", "power", "sqrt"]),
    ("Greedy", ["greedy", "activity selection", "minimum platforms"]),
    ("Matrix", ["matrix", "grid", "2d"]),
    ("Bit_Manipulation", ["bit", "xor", "set bits"]),
    ("Backtracking", ["permutation", "combination", "n queen", "sudoku"]),
    ("Strings", [
        "string", "substring", "subsequence", "palindrome", "anagram", "character",
        "roman", "parentheses",
    ]),
    ("Arrays", [
        "array", "largest", "smallest", "subarray", "subsequence", "element",
        "duplicate", "missing", "rotate", "merge sorted", "kadane", "prefix sum", "majority",
    ]),
]


DIFFICULTY_MAP = {
    "school": "Easy",
    "basic": "Easy",
    "easy": "Easy",
    "medium": "Medium",
    "hard": "Hard",
}


def normalize_difficulty(difficulty: str) -> str:
    key = (difficulty or "").strip().lower()
    return DIFFICULTY_MAP.get(key, "Easy")


def get_primary_category(tags: list[str], title: str = "", repo_root: str = "") -> str:
    for tag in tags or []:
        category = TAG_CATEGORY_MAP.get((tag or "").strip().lower())
        if category:
            return prefer_existing_category_folder(repo_root, category)

    title_key = (title or "").strip().lower()
    for category, keywords in TITLE_CATEGORY_RULES:
        if any(keyword in title_key for keyword in keywords):
            return prefer_existing_category_folder(repo_root, category)

    return prefer_existing_category_folder(repo_root, "General")


def prefer_existing_category_folder(repo_root: str, category: str) -> str:
    if not repo_root:
        return category

    root = Path(repo_root)
    dsa_root = Path(repo_root) / "DSA"

    normalized_category = category.lower().replace("_", "")
    candidates = []

    if dsa_root.exists():
        candidates.extend(child for child in dsa_root.iterdir() if child.is_dir())

    if root.exists():
        candidates.extend(
            child for child in root.iterdir()
            if child.is_dir() and child.name not in {".git", "DSA"}
        )

    for child in candidates:
        normalized_existing = child.name.lower().replace("_", "").replace(" ", "")
        if normalized_existing == normalized_category:
            return child.name

    return category
