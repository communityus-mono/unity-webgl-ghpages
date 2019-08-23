
// To prevent error you need to set this before calling UnityLoader.instantiate()
// https://gist.github.com/kyptov/f7e4718ee93b5c42bb975bc006fb10b4
UnityLoader.Compression.gzip = UnityLoader.Compression.identity;

UnityLoader.Compression.brotli = UnityLoader.Compression.identity;

UnityLoader.Compression.identity.hasUnityMarker = function() { return false;};

UnityLoader.Cryptography.crc32 = null;

UnityLoader.Cryptography.sha1 = null;
