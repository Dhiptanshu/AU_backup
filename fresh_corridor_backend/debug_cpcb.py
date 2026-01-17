import urllib.request
import ssl

def debug_cpcb():
    url = "https://airquality.cpcb.gov.in/caaqms/iit_rss_feed_with_coordinates"
    print(f"Connecting to {url}...")
    
    try:
        # Ignore SSL cert errors (common govt site issue)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(
            url, 
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        
        with urllib.request.urlopen(req, context=ctx, timeout=30) as response:
            data = response.read()
            print(f"Status: {response.status}")
            print("--- RAW DATA START ---")
            print(data.decode('utf-8', errors='ignore')[:1000]) # First 1000 chars
            print("--- RAW DATA END ---")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_cpcb()
