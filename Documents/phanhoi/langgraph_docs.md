# LangGraph & LangChain Documentation (Tháng 12/2025)

> **Cập nhật**: 5 tháng 12, 2025  
> **Nguồn**: https://docs.langchain.com, https://reference.langchain.com

---

## 📌 THAY ĐỔI QUAN TRỌNG (Breaking Changes)

### 1. `create_react_agent` đã DEPRECATED và được chuyển sang `langchain.agents`

```python
# ❌ CŨ (LangGraph 0.2.x) - Không còn hoạt động
from langgraph.prebuilt import create_react_agent

# ✅ MỚI (LangChain 1.x / LangGraph v1)
from langchain.agents import create_agent
```

### 2. `state_modifier` đã bị XÓA, thay bằng `prompt`

```python
# ❌ CŨ - Không còn hoạt động từ tháng 1/2025
agent = create_react_agent(
    model=llm,
    tools=tools,
    state_modifier="You are a helpful assistant"  # ĐÃ BỊ XÓA!
)

# ✅ MỚI - Sử dụng `prompt`
agent = create_agent(
    model="gemini-2.0-flash",
    tools=tools,
    system_prompt="You are a helpful assistant"  # Hoặc dùng `prompt`
)
```

---

## 📚 1. LangChain 1.0 (GA October 2025)

### Installation
```bash
pip install -U langchain langchain-google-genai langgraph
```

### Quick Start - Create Agent
```python
from langchain.agents import create_agent

def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"

agent = create_agent(
    model="claude-sonnet-4-5-20250929",  # hoặc "gemini-2.0-flash"
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

# Run the agent
result = agent.invoke(
    {"messages": [{"role": "user", "content": "what is the weather in sf"}]}
)
```

---

## 📚 2. LangGraph create_react_agent (DEPRECATED)

> ⚠️ **Lưu ý**: `create_react_agent` trong `langgraph.prebuilt` đã deprecated.  
> Sử dụng `from langchain.agents import create_agent` thay thế.

### Signature (Legacy Reference)
```python
create_react_agent(
    model: str | LanguageModelLike | Callable,
    tools: Sequence[BaseTool | Callable | dict] | ToolNode,
    *,
    prompt: Prompt | None = None,              # ✅ Thay thế state_modifier
    response_format: StructuredResponseSchema | None = None,
    pre_model_hook: RunnableLike | None = None,
    post_model_hook: RunnableLike | None = None,
    state_schema: StateSchemaType | None = None,
    checkpointer: Checkpointer | None = None,
    store: BaseStore | None = None,
    interrupt_before: list[str] | None = None,
    interrupt_after: list[str] | None = None,
    debug: bool = False,
    version: Literal["v1", "v2"] = "v2",
    name: str | None = None,
) -> CompiledStateGraph
```

### Parameters quan trọng:

#### `model`
- **Static**: `ChatGoogleGenerativeAI(model="gemini-2.0-flash")`
- **String**: `"openai:gpt-4"` hoặc `"gemini-2.0-flash"`
- **Dynamic**: Callable `(state, runtime) -> BaseChatModel`

#### `tools`
- `Sequence[BaseTool | Callable | dict]`
- `ToolNode` instance

#### `prompt` (thay thế `state_modifier`)
- `str`: Chuyển thành SystemMessage
- `SystemMessage`: Thêm vào đầu messages
- `Callable`: Function nhận state, trả về messages
- `Runnable`: Tương tự Callable

---

## 📚 3. Tool Definition (@tool decorator)

### Sync Tool
```python
from langchain.tools import tool

@tool(description="Get the current weather in a given location")
def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"It's sunny in {location}."
```

### Async Tool ✅ ĐƯỢC HỖ TRỢ
```python
from langchain.tools import tool
import aiohttp

@tool(description="Search the web for information")
async def search_web(query: str) -> str:
    """Search the web asynchronously."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"https://api.example.com/search?q={query}") as resp:
            data = await resp.json()
            return data.get("result", "No results found")
```

### Tool với Type Hints
```python
from langchain.tools import tool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="The search query")
    max_results: int = Field(default=5, description="Maximum number of results")

@tool(args_schema=SearchInput)
def search_documents(query: str, max_results: int = 5) -> str:
    """Search documents in the knowledge base."""
    # Implementation
    return f"Found {max_results} documents for '{query}'"
```

---

## 📚 4. Google Gemini Integration

### Installation
```bash
pip install -U langchain-google-genai
```

### Environment
```bash
export GOOGLE_API_KEY="your-api-key"
```

### ChatGoogleGenerativeAI
```python
from langchain_google_genai import ChatGoogleGenerativeAI

model = ChatGoogleGenerativeAI(
    model="gemini-3-pro-preview",  # hoặc "gemini-2.0-flash"
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)

# Invocation
messages = [
    ("system", "You are a helpful assistant."),
    ("human", "Hello!"),
]
ai_msg = model.invoke(messages)

# Access content
print(ai_msg.text)  # Trả về string
print(ai_msg.content)  # Trả về list of content blocks
```

### Tool Calling với Gemini
```python
from langchain.tools import tool
from langchain.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

@tool(description="Get the current weather in a given location")
def get_weather(location: str) -> str:
    return "It's sunny."

# Bind tools to model
model_with_tools = ChatGoogleGenerativeAI(
    model="gemini-3-pro-preview"
).bind_tools([get_weather])

# Step 1: Model generates tool calls
messages = [HumanMessage("What's the weather in Boston?")]
ai_msg = model_with_tools.invoke(messages)
messages.append(ai_msg)

print(ai_msg.tool_calls)
# [{'name': 'get_weather', 'args': {'location': 'Boston'}, 'id': '...', 'type': 'tool_call'}]

# Step 2: Execute tools
for tool_call in ai_msg.tool_calls:
    tool_result = get_weather.invoke(tool_call)
    messages.append(tool_result)

# Step 3: Get final response
final_response = model_with_tools.invoke(messages)
print(final_response.text)
# "The weather in Boston is sunny."
```

---

## 📚 5. Agent Invocation

### Sync Invocation
```python
from langchain.agents import create_agent

agent = create_agent(
    model="gemini-2.0-flash",
    tools=[get_weather, search_documents],
    system_prompt="You are a maritime assistant.",
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "What's the weather?"}]
})

# Output format
print(result["messages"])  # List of all messages
print(result["messages"][-1].content)  # Final AI response
```

### Async Invocation ✅ ĐƯỢC HỖ TRỢ
```python
import asyncio

async def run_agent():
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": "Search for COLREGS"}]
    })
    return result

# Run
result = asyncio.run(run_agent())
```

### Streaming
```python
for chunk in agent.stream({
    "messages": [{"role": "user", "content": "Explain SOLAS"}]
}):
    print(chunk)
```

---

## 📚 6. Output Format

### AIMessage Structure
```python
AIMessage(
    content=[
        {'type': 'text', 'text': "Hello!", 'extras': {'signature': '...'}}
    ],
    additional_kwargs={},
    response_metadata={
        'finish_reason': 'STOP',
        'model_name': 'gemini-3-pro-preview',
        'safety_ratings': [],
    },
    id='lc_run--...',
    usage_metadata={
        'input_tokens': 21,
        'output_tokens': 779,
        'total_tokens': 800,
    }
)
```

### Accessing Content
```python
# Cách 1: Lấy text trực tiếp
text = response.text  # "Hello!"

# Cách 2: Lấy full content
content = response.content  
# [{'type': 'text', 'text': 'Hello!', 'extras': {...}}]

# Cách 3: Tool calls
if response.tool_calls:
    for call in response.tool_calls:
        print(call['name'], call['args'])
```

---

## 📚 7. Version Compatibility

| Package | Khuyến nghị | Ghi chú |
|---------|-------------|---------|
| `langchain` | >= 1.0.0 | GA October 2025 |
| `langchain-core` | >= 0.3.0 | |
| `langgraph` | >= 0.2.70 | Deprecated, dùng langchain.agents |
| `langchain-google-genai` | >= 2.1.0 | Hỗ trợ Gemini 3 |

### Requirements.txt mẫu
```
langchain>=1.0.0
langchain-google-genai>=2.1.0
langgraph>=0.2.70
pydantic>=2.0.0
aiohttp>=3.9.0
```

---

## 📚 8. Migration Guide: LangGraph 0.2 → LangChain 1.0

### Import Changes
```python
# OLD
from langgraph.prebuilt import create_react_agent
from langgraph.prebuilt import AgentState

# NEW
from langchain.agents import create_agent, AgentState
```

### Parameter Changes
```python
# OLD (LangGraph 0.2.x)
agent = create_react_agent(
    model=llm,
    tools=tools,
    state_modifier=lambda state: [
        SystemMessage(content="You are helpful"),
        *state["messages"]
    ]
)

# NEW (LangChain 1.0)
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="You are helpful"
)

# Hoặc với dynamic prompt:
def my_prompt(state):
    instructions = state.get("instructions", "Be helpful")
    return [
        SystemMessage(content=instructions),
        *state["messages"]
    ]

agent = create_agent(
    model=llm,
    tools=tools,
    prompt=my_prompt  # Callable hoặc Runnable
)
```

### Invocation Changes
```python
# OLD & NEW đều giống nhau
result = agent.invoke({"messages": messages})
result = await agent.ainvoke({"messages": messages})
```

---

## 📚 9. Complete Example: Maritime AI Chatbot

```python
import asyncio
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

# Define tools
@tool(description="Search maritime regulations and documents")
async def search_maritime_docs(query: str) -> str:
    """Search the maritime knowledge base for regulations."""
    # Implement actual search logic
    return f"Found documents about: {query}"

@tool(description="Get current weather and sea conditions")
def get_sea_conditions(location: str) -> str:
    """Get weather and sea conditions for a maritime location."""
    return f"Sea conditions at {location}: calm, visibility 10nm"

# Create agent with Gemini
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.3,
)

agent = create_agent(
    model=llm,
    tools=[search_maritime_docs, get_sea_conditions],
    system_prompt="""You are a Maritime AI Assistant specialized in:
- COLREGS (International Regulations for Preventing Collisions at Sea)
- SOLAS (Safety of Life at Sea) conventions
- IALA maritime buoyage systems
- Navigation and seamanship

Provide accurate, professional answers based on official maritime sources.
Always cite relevant regulations when applicable."""
)

# Run async
async def chat(user_message: str):
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": user_message}]
    })
    return result["messages"][-1].content

# Usage
response = asyncio.run(chat("Explain Rule 15 of COLREGS"))
print(response)
```

---

## 📚 10. Troubleshooting

### Error: `state_modifier` not found
```python
# ❌ Error
TypeError: create_react_agent() got an unexpected keyword argument 'state_modifier'

# ✅ Fix: Use `prompt` instead
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="Your system prompt here"  # or prompt=...
)
```

### Error: Import from langgraph.prebuilt
```python
# ❌ Deprecated
from langgraph.prebuilt import create_react_agent

# ✅ New location
from langchain.agents import create_agent
```

### Error: Tool not being called
```python
# Ensure tool has proper description
@tool(description="Detailed description of what the tool does")
def my_tool(arg: str) -> str:
    """Docstring is also used if description not provided."""
    pass
```

---

## 📌 Quick Reference Card

| Task | Code |
|------|------|
| Create Agent | `from langchain.agents import create_agent` |
| Define Tool | `@tool(description="...")` |
| Gemini Model | `ChatGoogleGenerativeAI(model="gemini-2.0-flash")` |
| Invoke Sync | `agent.invoke({"messages": [...]})` |
| Invoke Async | `await agent.ainvoke({"messages": [...]})` |
| Get Response | `result["messages"][-1].content` |
| System Prompt | `system_prompt="..."` in create_agent |
| Bind Tools | `model.bind_tools([tool1, tool2])` |

---

*Document generated: 5 December 2025*  
*Based on: LangChain 1.0, LangGraph 0.2.x, langchain-google-genai 2.x*
