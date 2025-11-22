/**
 * Title Factory
 *
 * Creates book titles with optional ISBN assignments
 */

import { faker } from '@faker-js/faker';
import { TenantFactory, type Tenant } from './tenant-factory';
import { AuthorFactory, type Author } from './author-factory';

export interface Title {
  id: string;
  tenant_id: string;
  title: string;
  subtitle?: string;
  genre?: string;
  word_count?: number;
  publication_status: 'draft' | 'published' | 'archived';
  isbn?: string; // Physical book ISBN
  eisbn?: string; // Ebook ISBN
  publication_date?: string;
}

export class TitleFactory {
  private createdTitles: string[] = [];

  constructor(
    private tenantFactory: TenantFactory,
    private authorFactory: AuthorFactory
  ) {}

  /**
   * Create test title
   *
   * @param tenant - Tenant object (auto-created if not provided)
   * @param author - Author object (auto-created if not provided)
   * @param overrides - Override default title properties
   * @returns Created title object
   */
  async createTitle(
    tenant?: Tenant,
    author?: Author,
    overrides: Partial<Title> = {}
  ): Promise<Title> {
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    if (!author) {
      author = await this.authorFactory.createAuthor(tenant);
    }

    const title: Omit<Title, 'id'> = {
      tenant_id: tenant.id,
      title: overrides.title || faker.lorem.words(3),
      subtitle: overrides.subtitle || faker.lorem.words(5),
      genre: overrides.genre || faker.helpers.arrayElement(['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi']),
      word_count: overrides.word_count || faker.number.int({ min: 50000, max: 150000 }),
      publication_status: overrides.publication_status || 'draft',
      isbn: overrides.isbn,
      eisbn: overrides.eisbn,
      publication_date: overrides.publication_date,
    };

    const response = await fetch(`${process.env.API_URL}/titles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(title),
    });

    if (!response.ok) {
      throw new Error(`Failed to create title: ${response.statusText}`);
    }

    const created: Title = await response.json();
    this.createdTitles.push(created.id);

    return created;
  }

  /**
   * Cleanup: Delete all created titles
   */
  async cleanup() {
    for (const titleId of this.createdTitles) {
      try {
        await fetch(`${process.env.API_URL}/titles/${titleId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error(`Failed to cleanup title ${titleId}:`, error);
      }
    }
    this.createdTitles = [];
  }
}
