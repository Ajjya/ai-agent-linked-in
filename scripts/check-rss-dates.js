const Parser = require('rss-parser');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['content:encoded', 'content'],
    ],
  },
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)',
  },
});

async function checkDates() {
  try {
    console.log('\n📅 Checking RSS Article Dates\n');
    
    const rssUrls = [
      'https://www.mongodb.com/blog/rss.xml',
      'https://feeds.feedburner.com/MongoDBBlog',
    ];

    let feed = null;
    for (const url of rssUrls) {
      try {
        feed = await parser.parseURL(url);
        console.log(`✅ Successfully parsed: ${url}\n`);
        break;
      } catch (error) {
        console.log(`⚠️ Failed: ${url}\n`);
      }
    }

    if (!feed || !feed.items) {
      console.log('❌ No RSS feed found');
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log(`Current date: ${now.toISOString()}`);
    console.log(`7 days ago: ${oneWeekAgo.toISOString()}\n`);

    const recent = [];
    const old = [];

    feed.items.forEach((item, index) => {
      const pubDate = new Date(item.pubDate);
      const isRecent = pubDate >= oneWeekAgo;
      
      if (isRecent) {
        recent.push({
          title: item.title,
          date: pubDate.toISOString(),
        });
      } else {
        old.push({
          title: item.title,
          date: pubDate.toISOString(),
        });
      }
    });

    console.log(`\n✅ Recent articles (last 7 days): ${recent.length}`);
    recent.slice(0, 5).forEach(item => {
      console.log(`   - ${item.title.substring(0, 60)}`);
      console.log(`     ${item.date}`);
    });

    console.log(`\n⏭️  Old articles (older than 7 days): ${old.length}`);
    old.slice(0, 5).forEach(item => {
      console.log(`   - ${item.title.substring(0, 60)}`);
      console.log(`     ${item.date}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDates();
