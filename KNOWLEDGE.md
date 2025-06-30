# DocTool Knowledge Base

## Project Overview

DocTool is a multi-agent documentation review and management system that leverages AI agents for content generation while using reliable code for system operations.

## Core Design Principles

### 1. AI vs Regular Code Separation
**Principle**: Use regular code for tasks where AI is not required to improve the reliability of the system.

**Rationale**: 
- AI should be used for content generation, analysis, and decision-making where creativity and understanding are needed
- File system operations, directory scanning, configuration management, and other deterministic tasks should use regular TypeScript/JavaScript code
- This hybrid approach maximizes reliability while leveraging AI where it adds the most value

**Examples**:
- ✅ Use regular code: Directory scanning, file existence checks, creating folder structures
- ✅ Use AI agents: Generating documentation content, analyzing code for documentation gaps, summarizing changes
- ✅ Use regular code: Managing agent orchestration, error handling, state management
- ✅ Use AI agents: Writing knowledge file content, reviewing documentation quality

### 2. Modular Agent Architecture
- Each agent has a specific, well-defined responsibility
- Agents are organized in separate files within `src/agents/`
- Clear separation of concerns between different types of agents

## Project Structure

```
doctool/
├── src/
│   ├── agents/           # AI agent definitions
│   │   ├── index.ts     # Agent exports
│   │   ├── storyAgent.ts
│   │   ├── summaryAgent.ts
│   │   └── knowledgeManagerAgent.ts
│   └── index.ts         # Main application entry
├── multi-agent-plan.md  # Detailed system architecture
└── KNOWLEDGE.md         # This file
```

## Development Guidelines

### File Organization
- One agent per file in the `src/agents/` directory
- Use descriptive names ending in "Agent" (e.g., `knowledgeManagerAgent.ts`)
- Export agents from `src/agents/index.ts` for clean imports

### Knowledge Management Strategy
- Each directory should have a knowledge file if it contains important information
- Knowledge files should be created systematically across the project
- Regular code handles the scanning and file creation logic
- AI agents generate the actual content for knowledge files

## Current Status

- ✅ Basic agent structure established
- ✅ Modular agent file organization
- 🔄 Knowledge file management system (in progress)
- ⏳ Full multi-agent documentation review system (planned)

## Next Steps

1. Create utility functions for directory scanning and knowledge file management
2. Implement the knowledge manager system using the hybrid approach
3. Expand to full multi-agent documentation review capabilities

---

*Last updated: 2025-06-30*
*This knowledge file follows the project's principle of using AI for content generation while relying on regular code for system operations.*
