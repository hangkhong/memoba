# Why search alone is not enough

The usual way to put a model on top of a company's files is retrieval-augmented generation, or RAG. Split the files into chunks. When a question arrives, find the chunks most similar to it, paste them into the prompt, and ask the model to answer.

RAG works well for "what does this document say?". Reusing past work is a harder question. It asks how several attempts went under different conditions, and whether any of that applies now. Plain RAG falls short there in specific ways.

## Where plain RAG falls short

**It searches once, before it knows what matters.** The first search uses the words of the question. A good colleague would look at the results and then ask a different question, such as "did this ever fail?". A fixed pipeline can't, so it tends to return the successes that sound most like the request.

**A chunk loses its outcome.** Similarity picks the passage that sounds like the question, and that is often the description of the approach. The outcome sits in another chunk, and the answer sounds like a recommendation for something that went badly.

**The model is filled before it thinks.** Every chunk goes into the prompt whether it helps or not. Long documents crowd out short ones, and the model has no way to choose. Our first agent design still searched before reasoning, and we removed that step.

**Nothing separates "none" from "failed".** When retrieval returns nothing, the model sees an empty context either way. If the search service was down, the answer reads as if the team has no experience.

**Citations are decoration.** A model can name any source it was shown, including ones it only skimmed in a list. The link looks like evidence and may prove nothing.

**Retrieved text is treated as instructions.** A case that happens to contain "ignore the policy" sits in the prompt beside the real instructions.

## What Memoba does instead

The idea is simple to state. A chatbot answers from what it is given. Memoba goes and reads.

| Weakness | What Memoba does |
|---|---|
| Searches once | The agent decides what to search, and searches again with different wording, including for failures |
| Chunks lose outcomes | Reading a case always returns its outcome first, in a header |
| Filled before thinking | Search returns short previews. The agent opens only what looks relevant |
| "None" equals "failed" | Each source reports its own state from the real tool result |
| Decorative citations | A citation can only point at a section delivered by a read in this run. The application checks every one |
| Text as instructions | Case and document text is passed as data, and the agent has no write tools to misuse |

The core of the design is a division of work. The model handles judgment: what to look at, what is relevant, how to word the answer. The application handles everything that must stay true whatever the model decides: what it may read, how far it may go, when it must stop, and whether its citations are real. [How the agent answers a question](how-the-agent-answers.md) walks through this.

## What this costs

An agent is not free, and we don't think it is always the better choice.

It makes several model calls where RAG makes one, so it is slower and uses more tokens. The measured runs took roughly 3 to 28 seconds, and the longest used tens of thousands of tokens ([evaluation record](../reference/evaluation.md)). A plain pipeline would be faster.

It also reads less. The agent opened two to nine cases per question, where a pipeline could paste in dozens of chunks. We accept this because a case read in full, with its outcome and conditions, is worth more than many fragments. It does mean a question like "everything we learned about pricing" gets a partial view today.

For this product the trade is right. A wrong answer about past work costs more than a slow one, and speed only has to beat an afternoon of asking around.
