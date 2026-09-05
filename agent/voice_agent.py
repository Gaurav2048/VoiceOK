from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, room_io, RunContext
from livekit.agents.llm import function_tool
from livekit.plugins import silero, openai, deepgram
from tavily import AsyncTavilyClient
from datetime import datetime
import os

load_dotenv()

tavily_client = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


class Assistant(Agent):
    """Basic voice assistant that books airbnb"""

    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are a helpful assistant that can answer questions and provide information. "
                "You have a `web_search` tool that searches the live internet — use it whenever "
                "the user asks about current events, news, prices, sports scores, weather, or "
                "anything else that could have changed since your training data, or that you're "
                "not confident about. Don't guess or answer from stale knowledge in those cases; "
                "call the tool instead. Keep answers conversational and concise, since this is a "
                "spoken phone call, not a chat window."
            ),
        )

    @function_tool()
    async def web_search(self, context: RunContext, query: str) -> str:
        """Search the live web for current information.

        Use this whenever the user asks something time-sensitive or outside your own
        knowledge — news, current events, prices, sports scores, weather, or any fact
        that could have changed recently.

        Args:
            query: The search query to look up.
        """
        try:
            response = await tavily_client.search(
                query=query,
                search_depth="basic",
                max_results=5,
                include_answer=True,
            )
        except Exception as e:
            return f"The web search failed: {e}"

        if response.get("answer"):
            return response["answer"]

        results = response.get("results", [])
        if not results:
            return "No results found for that search."

        return "\n".join(
            f"- {r['title']}: {r['content'][:300]}" for r in results[:3]
        )


async def entrypoint(ctx: JobContext):

    session = AgentSession(
        stt=deepgram.STT(model="nova-2"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(voice="echo"),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )

    await session.generate_reply(
        instructions="Give a warm greeting and ask how can you help."
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))