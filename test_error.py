import urllib.request
import urllib.error

req = urllib.request.Request('http://127.0.0.1:8000/api/v1/admin/dashboard/summary', headers={'Authorization': 'Bearer mock-admin-token'})
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
