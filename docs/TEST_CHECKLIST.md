# Cache System Test Checklist

**Date**: 2025-11-20  
**Purpose**: Verify all critical cache fixes are working correctly

## Pre-Test Setup

1. ✅ Ensure web server is running
2. ✅ Ensure Python dependencies are installed
3. ✅ Ensure OAuth credentials are configured
4. ✅ Clear any existing cache (optional, to test fresh cache creation):
   ```bash
   rm -rf .cache/*.json
   ```

## Test 1: Cache File Creation ✅

**Goal**: Verify cache files are created when refreshing containers

**Steps**:
1. Open Container Browser
2. Click "Search Containers"
3. Wait for containers to load

**Expected Result**:
- Cache file created: `.cache/container_data_{accountId}.json` or `.cache/container_data_all.json`
- File contains container list with metadata
- Console shows `[CACHE] Saved X containers to account cache`

**Verify**:
```bash
ls -la .cache/container_data_*.json
cat .cache/container_data_*.json | head -20
```

---

## Test 2: Cache Hit on Second Request ✅

**Goal**: Verify cache is used on subsequent requests

**Steps**:
1. Refresh containers (Test 1)
2. Click "Search Containers" again immediately

**Expected Result**:
- Console shows `[CACHE HIT] Returning X containers from cache`
- Response includes `fromCache: true`
- Containers load instantly (no API delay)

---

## Test 3: Cache Invalidation After Update ✅

**Goal**: Verify cache is invalidated after tag update

**Steps**:
1. Search containers and expand one
2. Note the tag version shown
3. Update a tag in that container
4. Immediately expand the container again (or refresh tags)

**Expected Result**:
- Console shows `[CACHE] Invalidated tags cache for X container(s)`
- Next tag fetch shows updated version (not cached old version)
- Cache file shows `tags: undefined` or updated tags

**Verify**:
```bash
# Check cache file - tags should be cleared or updated
cat .cache/container_data_*.json | grep -A 5 "containerId.*31734165"
```

---

## Test 4: Filter3E Cache Handling ✅

**Goal**: Verify cache handles filter changes correctly

**Steps**:
1. Expand a container with filter3E=false (show all tags)
2. Note number of tags
3. Toggle filter3E=true (show only 3E tags)
4. Note number of tags (should be fewer)
5. Toggle back to filter3E=false

**Expected Result**:
- Each filter shows correct cached tags
- No incorrect cache hits when filter changes
- Console shows correct filter in cache logs

---

## Test 5: allAccounts Cache ✅

**Goal**: Verify cache works for both single account and all accounts

**Steps**:
1. Search containers with "All Accounts" unchecked
2. Verify cache file: `container_data_{accountId}.json`
3. Search containers with "All Accounts" checked
4. Verify cache file: `container_data_all.json`

**Expected Result**:
- Separate cache files for single vs all accounts
- Each mode uses correct cache file
- No cache conflicts between modes

---

## Test 6: Corrupted Cache Recovery ✅

**Goal**: Verify system recovers from corrupted cache files

**Steps**:
1. Manually corrupt a cache file:
   ```bash
   echo "invalid json { broken" > .cache/container_data_4702086067.json
   ```
2. Try to load containers

**Expected Result**:
- Console shows `[CACHE] Corrupted cache file detected, deleting`
- Corrupted file is deleted
- Fresh data is fetched from API
- New cache file is created

---

## Test 7: Race Condition Prevention ✅

**Goal**: Verify atomic writes prevent corruption

**Steps**:
1. Open 3-5 browser tabs
2. In each tab, click "Search Containers" simultaneously
3. Wait for all to complete

**Expected Result**:
- All cache files remain valid JSON
- No corruption errors in console
- Cache files contain valid data
- No `.tmp` files left behind

**Verify**:
```bash
# Check for leftover temp files
ls -la .cache/*.tmp

# Verify all cache files are valid JSON
for f in .cache/*.json; do
  echo "Checking $f"
  python3 -m json.tool "$f" > /dev/null && echo "✅ Valid" || echo "❌ Invalid"
done
```

---

## Test 8: Tag Search Cache Integration ✅

**Goal**: Verify tag search uses and updates unified cache

**Steps**:
1. Search for a tag (e.g., "3E_RFI Submit")
2. Note which containers have the tag
3. Go to Container Browser
4. Expand one of those containers
5. Check if tags are already cached

**Expected Result**:
- Tag search updates cache with tag info
- Container browser shows cached tags (if container was in search results)
- No duplicate API calls

---

## Test 9: Container Metadata Cache ✅

**Goal**: Verify metadata caching works correctly

**Steps**:
1. Search containers
2. Click refresh button on a container
3. Click refresh again immediately

**Expected Result**:
- First refresh: `[CACHE MISS] Fetching metadata`
- Second refresh: `[CACHE HIT] Returning cached metadata`
- Metadata loads instantly on second refresh

---

## Test 10: Container Tags Cache ✅

**Goal**: Verify tags caching works correctly

**Steps**:
1. Expand a container (loads tags)
2. Collapse and expand again immediately

**Expected Result**:
- First expand: `[CACHE MISS] Fetching tags`
- Second expand: `[CACHE HIT] Returning X cached tags`
- Tags load instantly on second expand

---

## Success Criteria

All tests should pass with:
- ✅ No errors in console
- ✅ Cache files created and valid
- ✅ Cache hits working correctly
- ✅ Cache invalidation working
- ✅ No data corruption
- ✅ Performance improvements visible

## Troubleshooting

If tests fail:
1. Check browser console for errors
2. Check server logs for cache errors
3. Verify `.cache/` directory exists and is writable
4. Check file permissions: `ls -la .cache/`
5. Review `docs/CACHE_REVIEW.md` for known issues

## Next Steps After Testing

If all tests pass:
- ✅ Cache system is production-ready
- Consider implementing optimizations from `CACHE_REVIEW.md`
- Monitor cache performance in production

If tests fail:
- Review error messages
- Check `docs/CACHE_FIXES_IMPLEMENTED.md`
- Report specific failures for debugging

