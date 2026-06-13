const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

async function testGTFSRT() {
  try {
    const response = await fetch("https://mwe.mecatran.com/utw/ws/gtfsfeed/realtime/chambery?apiKey=223f2f102c1242570d3f0231326a271940774f72");
    if (!response.ok) {
      console.error("Fetch failed", response.status);
      return;
    }
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    
    console.log("Feed entities count:", feed.entity.length);
    if (feed.entity.length > 0) {
      console.log("First entity sample:");
      console.log(JSON.stringify(feed.entity[0], null, 2));
    }
  } catch (err) {
    console.error("Error decoding:", err);
  }
}

testGTFSRT();
