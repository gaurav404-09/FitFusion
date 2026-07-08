import sys, os
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))
sys.path.append(project_root)

# Set encoding for safe printing
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from nutrition_server import app
    print("All Routes:")
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        print(f"Endpoint: {rule.endpoint:25} | Route: {rule.rule:40} | Methods: {methods}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
