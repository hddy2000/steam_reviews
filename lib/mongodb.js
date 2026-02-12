import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('请在环境变量中添加 MONGODB_URI');
}

if (process.env.NODE_ENV === 'development') {
  // 开发环境使用全局变量
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 生产环境
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

// 获取数据库实例
export async function getDb() {
  const client = await clientPromise;
  return client.db('steam_reviews');
}
