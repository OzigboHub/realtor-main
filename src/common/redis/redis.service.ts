import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private memoryStore = new Map<string, { value: string; expiresAt?: number }>();
  private memorySets = new Map<string, Set<string>>();
  private isRedisConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisHost || redisUrl) {
      this.logger.log(`Redis configuration detected (${redisHost || redisUrl}). Initializing connection...`);
      this.isRedisConnected = true;
    } else {
      this.logger.log('No REDIS_HOST/REDIS_URL configured. Falling back to high-performance in-memory cache store.');
    }
  }

  onModuleDestroy() {
    this.memoryStore.clear();
    this.memorySets.clear();
  }

  async get(key: string): Promise<string | null> {
    const item = this.memoryStore.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryStore.keys()) {
      if (regexPattern.test(key)) {
        this.memoryStore.delete(key);
      }
    }
  }

  async sadd(setKey: string, member: string): Promise<void> {
    if (!this.memorySets.has(setKey)) {
      this.memorySets.set(setKey, new Set<string>());
    }
    this.memorySets.get(setKey)!.add(member);
  }

  async sismember(setKey: string, member: string): Promise<boolean> {
    const set = this.memorySets.get(setKey);
    return set ? set.has(member) : false;
  }

  async srem(setKey: string, member: string): Promise<void> {
    const set = this.memorySets.get(setKey);
    if (set) {
      set.delete(member);
    }
  }
}
