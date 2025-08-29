#!/usr/bin/env node

// Test script to verify Pexels API functionality within Docker container

async function testPexelsAPI() {
    console.log('🧪 Testing Pexels API within Docker container...');
    console.log('===============================================');
    
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    if (!PEXELS_API_KEY) {
        console.error('❌ PEXELS_API_KEY environment variable not set');
        process.exit(1);
    }
    
    console.log('✅ PEXELS_API_KEY found:', PEXELS_API_KEY.substring(0, 10) + '...');
    
    // Test 1: Search for images
    try {
        console.log('\n📷 Testing Image Search...');
        const imageUrl = `https://api.pexels.com/v1/search?query=nature&per_page=3`;
        const imageResponse = await fetch(imageUrl, {
            headers: { 'Authorization': PEXELS_API_KEY }
        });
        
        if (!imageResponse.ok) {
            throw new Error(`Image API error: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const imageData = await imageResponse.json();
        console.log('✅ Image search successful!');
        console.log(`   Total results: ${imageData.total_results}`);
        console.log(`   Photos returned: ${imageData.photos?.length || 0}`);
        
        if (imageData.photos && imageData.photos.length > 0) {
            console.log(`   First photo: ${imageData.photos[0].alt || 'No title'}`);
            console.log(`   Photographer: ${imageData.photos[0].photographer}`);
            console.log(`   URL: ${imageData.photos[0].src.medium}`);
        }
        
    } catch (error) {
        console.error('❌ Image search failed:', error.message);
    }
    
    // Test 2: Search for videos
    try {
        console.log('\n🎬 Testing Video Search...');
        const videoUrl = `https://api.pexels.com/videos/search?query=ocean&per_page=3`;
        const videoResponse = await fetch(videoUrl, {
            headers: { 'Authorization': PEXELS_API_KEY }
        });
        
        if (!videoResponse.ok) {
            throw new Error(`Video API error: ${videoResponse.status} ${videoResponse.statusText}`);
        }
        
        const videoData = await videoResponse.json();
        console.log('✅ Video search successful!');
        console.log(`   Total results: ${videoData.total_results}`);
        console.log(`   Videos returned: ${videoData.videos?.length || 0}`);
        
        if (videoData.videos && videoData.videos.length > 0) {
            console.log(`   First video: ${videoData.videos[0].user?.name || 'Unknown author'}`);
            console.log(`   Duration: ${videoData.videos[0].duration} seconds`);
            console.log(`   Video files: ${videoData.videos[0].video_files?.length || 0}`);
        }
        
    } catch (error) {
        console.error('❌ Video search failed:', error.message);
    }
    
    // Test 3: Test rate limiting (optional)
    console.log('\n⏱️  Testing API Rate Limits...');
    const startTime = Date.now();
    
    try {
        const promises = Array.from({ length: 3 }, (_, i) => 
            fetch(`https://api.pexels.com/v1/search?query=test${i}&per_page=1`, {
                headers: { 'Authorization': PEXELS_API_KEY }
            })
        );
        
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        
        console.log(`✅ Made 3 concurrent requests in ${endTime - startTime}ms`);
        console.log(`   Response statuses: ${responses.map(r => r.status).join(', ')}`);
        
    } catch (error) {
        console.error('❌ Rate limit test failed:', error.message);
    }
    
    console.log('\n🏁 Pexels API test completed!');
}

// Run the test
testPexelsAPI().catch(console.error);