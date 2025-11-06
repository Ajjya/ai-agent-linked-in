const aiContentService = require('../dist/services/aiContent').default;

const testCases = [
  {
    title: 'MongoDB Introduces Vector Search for AI Applications',
    description: 'MongoDB has released advanced vector search capabilities enabling semantic search for AI-powered applications. This feature allows developers to build intelligent search experiences that understand meaning beyond keywords.',
    category: 'announcement'
  },
  {
    title: 'Best Practices for MongoDB Performance Optimization',
    description: 'Learn how to optimize MongoDB queries, improve indexing strategies, and scale your database for production workloads. This comprehensive guide covers indexing, query optimization, connection pooling, and monitoring.',
    category: 'tutorial'
  },
  {
    title: 'Case Study: How TechCorp Scaled MongoDB to 10 Million Queries Per Day',
    description: 'TechCorp increased their MongoDB throughput from 1M to 10M queries per day using sharding, read replicas, and query optimization. This case study explores their architecture decisions and lessons learned.',
    category: 'case_study'
  }
];

async function runTests() {
  console.log('\n🧪 AI Content Generation Test Suite\n');

  const isConfigured = await aiContentService.isConfigured();

  if (!isConfigured) {
    console.log('❌ ERROR: OpenAI API is not configured');
    console.log('Please set OPENAI_API_KEY environment variable');
    console.log('\nExample:');
    console.log('  export OPENAI_API_KEY=sk-your-key-here');
    console.log('  npm run test:ai-content\n');
    process.exit(1);
  }

  console.log('✅ OpenAI API is configured\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test Case ${i + 1}/${testCases.length}: ${testCase.category.toUpperCase()}`);
    console.log(`═`.repeat(60));
    console.log(`Title: ${testCase.title}`);

    try {
      console.log('\n🤖 Generating content with AI...');
      
      const result = await aiContentService.generateLinkedInContent({
        title: testCase.title,
        description: testCase.description,
        link: 'https://example.com/article',
        category: testCase.category
      });

      console.log('\n✅ SUCCESS\n');
      console.log('Generated Title:');
      console.log(result.title);
      console.log('\nGenerated Content:');
      console.log(result.content);
      console.log('\n' + `─`.repeat(60));
      
      // Validate result
      if (!result.title || result.title.length < 5) {
        console.log('⚠️ WARNING: Title seems too short');
        failed++;
      } else if (!result.content || result.content.length < 50) {
        console.log('⚠️ WARNING: Content seems too short');
        failed++;
      } else if (result.content.endsWith('...')) {
        console.log('⚠️ WARNING: Content ends with ellipsis (should be avoided)');
        failed++;
      } else {
        passed++;
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log('Error:', error.message);
      failed++;
    }
  }

  console.log('\n' + `═`.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} total\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! AI content generation is working correctly.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
