# Quick local installation/build guide

```bash
# Download v0.0.3 client to shyfog-client folder
git clone --recurse-submodules -b v0.0.3 https://github.com/ShyFog/client.git shyfog-client

# Install modules and build the client
cd shyfog-client
npm install
npm run build

# Host public folder as a web server (for example, Python's http.server)
cd public
python3 -m http.server 80
```