const { spawn } = require('child_process');
const path = require('path');

exports.predictWellness = async (req, res) => {
    try {
        const userMetrics = req.body;
        console.log('>>> wellness/predict hit, payload keys:', Object.keys(userMetrics));
        console.log('>>> user.id from auth middleware:', req.user?.id);

        // Path to the Python executable and the wrapper script
        const pythonPath = 'python';
        const scriptPath = path.join(__dirname, '../../../predict_wrapper.py');
        const projectRoot = path.join(__dirname, '../../..');

        // Spawn Python process with project root as cwd so it can find scaler.pkl
        const pythonProcess = spawn(pythonPath, [scriptPath], { cwd: projectRoot });

        let output = '';
        let errorOutput = '';

        // Write metrics to stdin
        pythonProcess.stdin.write(JSON.stringify(userMetrics));
        pythonProcess.stdin.end();

        // Collect stdout
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        // Collect stderr
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script failed with code ${code}. Error: ${errorOutput}`);
                return res.status(500).json({
                    error: 'AI prediction failed',
                    details: errorOutput || 'Unknown error'
                });
            }

            try {
                // Strip any non-JSON prefix (e.g., debug logs) before parsing
                const jsonStart = output.lastIndexOf('{');
                const jsonStr = jsonStart !== -1 ? output.slice(jsonStart) : output;
                const result = JSON.parse(jsonStr);
                if (result.error) {
                    return res.status(500).json({
                        error: 'AI prediction failed',
                        details: result.error,
                        traceback: result.traceback
                    });
                }
                res.json(result);
            } catch (err) {
                console.error('Failed to parse Python output:', output);
                res.status(500).json({
                    error: 'Malformed prediction result',
                    details: output
                });
            }
        });

    } catch (error) {
        console.error('Wellness prediction controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
