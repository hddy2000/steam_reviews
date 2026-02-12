// 诊断脚本 - 测试 MongoDB 连接
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI exists:', !!uri);
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }
  
  // 隐藏密码输出
  const safeUri = uri.replace(/:([^@]+)@/, ':***@');
  console.log('URI:', safeUri);
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('steam_reviews');
    
    // 测试创建集合
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // 测试插入
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: true, date: new Date() });
    console.log('✅ Insert test passed');
    
    // 测试查询
    const result = await testCollection.findOne({ test: true });
    console.log('✅ Query test passed:', result ? 'found' : 'not found');
    
    // 清理测试数据
    await testCollection.deleteMany({ test: true });
    console.log('✅ Cleanup done');
    
    await client.close();
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n💡 Solution: Add 0.0.0.0/0 to MongoDB IP whitelist');
    }
    if (error.message.includes('authentication')) {
      console.log('\n💡 Solution: Check username/password in URI');
    }
    
    process.exit(1);
  }
}

testConnection();
