# Natural Language Logging Feature - TODO

## Phase 1: LangGraph Agent Updates

- [ ] 1. Add IntentParser class to extract structured data from natural language
- [ ] 2. Update RouterAgent to return tools_to_call array (LLM-based)
- [ ] 3. Add NutritionLoggingTool for inserting food logs with macro lookup
- [ ] 4. Add ActivityLoggingTool for inserting activities with calorie estimation
- [ ] 5. Update ResponseGenerator for logging confirmations

## Phase 2: API Updates

- [ ] 6. Update api.py with /agent/log endpoint

## Phase 3: Frontend Integration

- [ ] 7. Update database.js with addFoodLogFromAgent and addActivityFromAgent methods
- [ ] 8. Update AgentService.js with logToAgent method
- [ ] 9. Add realtime subscription helpers

## Phase 4: Testing

- [ ] 10. Test the complete flow
