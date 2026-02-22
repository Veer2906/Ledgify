import os


async def run_agent(connection_id: str, message: str) -> dict:
    openai_key = os.getenv("OPENAI_API_KEY")
    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:3000")

    if not openai_key:
        return {
            "status": "unavailable",
            "message": "Agent mode requires OPENAI_API_KEY. Please set it in your .env file. "
                       "In the meantime, you can use the individual tool endpoints directly.",
        }

    try:
        from mcp_use import MCPClient
        from langchain_openai import ChatOpenAI

        config = {
            "mcpServers": {
                "ledgify": {
                    "url": f"{mcp_url}/sse",
                }
            }
        }

        client = MCPClient(config)
        session = await client.create_session("ledgify")
        tools = await session.list_tools()

        llm = ChatOpenAI(model="gpt-4o", api_key=openai_key)
        from mcp_use import MCPAgent
        agent = MCPAgent(llm=llm, client=client, max_steps=5)
        result = await agent.run(message)

        await client.close_all_sessions()

        return {
            "status": "success",
            "response": str(result),
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Agent error: {str(e)}",
        }
