# GPT-Cursor Runner

A Flask-based webhook handler for processing GPT-generated hybrid blocks and saving them as JSON patches.

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   Create a `.env` file with:
   ```
   ENDPOINT_URL=http://localhost:5050/webhook
   NGROK_PORT=5050
   ```

## 🧵 CLI Usage

Once installed, run the server via:

```bash
gpt-cursor-runner
```

Or send a test payload:

```bash
python -m gpt_cursor_runner.post_to_webhook
```

## 🧪 Testing

1. **Start the Flask server:**
   ```bash
   python gpt_cursor_runner/main.py
   ```

2. **Send a test hybrid block:**
   ```bash
   python gpt_cursor_runner/post_to_webhook.py
   ```

## 📁 File Structure

- `gpt_cursor_runner/main.py` - Flask webhook server
- `gpt_cursor_runner/webhook_handler.py` - Processes incoming GPT blocks
- `gpt_cursor_runner/post_to_webhook.py` - Test script to simulate GPT sending blocks
- `gpt_cursor_runner/patch_runner.py` - Apply saved patches to target files
- `gpt_cursor_runner/read_patches.py` - Read and display saved patches
- `gpt_cursor_runner/apply_patch.py` - Apply patches to files (Option 3 preview)
- `gpt_cursor_runner/demo_workflow.py` - Complete workflow demo
- `patches/` - Directory where JSON patches are saved

## 🔄 How It Works

1. GPT generates a hybrid block (like Cursor would)
2. The block is sent to the `/webhook` endpoint
3. `webhook_handler.py` processes the block and saves it as a timestamped JSON file
4. The patch is saved in the `patches/` directory

## 📊 Sample Output

When you run the test, you'll see:
- Flask server logs the incoming block
- A JSON file is created in `patches/` with the format: `{id}_{timestamp}.json`
- The webhook returns a success response with the saved file path

## 🔜 Next Steps (Option 3 Preview)

Once this is working, we can evolve this into a direct patch runner that:
- Reads the saved JSON patches
- Applies them directly to target files
- Optionally commits changes to Git

## 🎯 Usage

The system expects hybrid blocks in this format:
```json
{
  "id": "patch-identifier",
  "role": "ui_patch",
  "description": "Description of the patch",
  "target_file": "path/to/target/file.tsx",
  "patch": {
    "pattern": "regex_pattern",
    "replacement": "new_code"
  },
  "metadata": {
    "author": "gpt-4",
    "timestamp": "auto"
  }
}
```

## 📦 Installation

For development, install in editable mode:

```bash
pip install -e .
```

This will make the `gpt-cursor-runner` command available globally. 