const express = require("express");
const router = express.Router();
const axios = require("axios");

// Python Agent runs on port 5002
const PYTHON_AGENT_URL =
  process.env.PYTHON_AGENT_URL || "http://localhost:5002";

// Health check
router.get("/health", async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_AGENT_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: "Python agent unavailable",
    });
  }
});

// Process natural language query (for info queries)
router.post("/query", async (req, res) => {
  try {
    const { query, user_id, user_context } = req.body;

    if (!query || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Query and user_id are required",
      });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    try {
      if (authHeader) {
        const v = String(authHeader);
        console.log(
          `[agentRoutes/query] auth header len=${v.length} prefix=${v.slice(0, 18)}`,
        );
      } else {
        console.log("[agentRoutes/query] no auth header");
      }
    } catch (_) {}
    const response = await axios.post(
      `${PYTHON_AGENT_URL}/agent/query`,
      {
        query,
        user_id,
        user_context: user_context || {},
      },
      {
        timeout: 30000,
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Agent query error:", error.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: "Failed to process query",
      message: error.message,
      upstream_status: error?.response?.status,
      upstream_data: error?.response?.data,
    });
  }
});

// Natural Language Logging Endpoint
router.post("/log", async (req, res) => {
  try {
    const { query, user_id, date } = req.body;

    if (!query || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Query and user_id are required",
      });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    try {
      if (authHeader) {
        const v = String(authHeader);
        console.log(
          `[agentRoutes/log] auth header len=${v.length} prefix=${v.slice(0, 18)}`,
        );
      } else {
        console.log("[agentRoutes/log] no auth header");
      }
    } catch (_) {}
    const response = await axios.post(
      `${PYTHON_AGENT_URL}/agent/log`,
      {
        query,
        user_id,
        date: date || new Date().toISOString().split("T")[0],
      },
      {
        timeout: 30000,
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Agent log error:", error.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: "Failed to log data",
      message: error.message,
      upstream_status: error?.response?.status,
      upstream_data: error?.response?.data,
    });
  }
});

// Quick stats endpoint
router.get("/quick/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const response = await axios.get(`${PYTHON_AGENT_URL}/agent/quick`, {
      params: { user_id: userId },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Quick stats error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get stats",
    });
  }
});

// Quick stats endpoint (query param version)
router.get("/quick", async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    const response = await axios.get(`${PYTHON_AGENT_URL}/agent/quick`, {
      params: { user_id: userId },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Quick stats error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get stats",
    });
  }
});

module.exports = router;
