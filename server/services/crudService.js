/**
 * Shared CRUD Service
 * 
 * Generic CRUD operations with caching, validation,
 * and optimized database queries
 */

const databaseService = require('./databaseService');
const apiResponseService = require('./apiResponseService');

class CrudService {
  constructor() {
    this.cachePrefix = 'crud';
  }

  /**
   * Generic GET all with filtering, sorting, and pagination
   */
  async getAll(req, res, options = {}) {
    const {
      table,
      selectFields = '*',
      joins = [],
      filters = [],
      sortableFields = [],
      defaultSort = 'created_at DESC',
      cacheKey = null,
      cacheTime = 300000, // 5 minutes
      translations = null // { table: 'translations_table', fields: ['name', 'description'] }
    } = options;

    try {
      const {
        page = 1,
        limit = 20,
        sort_by,
        sort_order = 'desc',
        search,
        ...filters
      } = req.query;

      const offset = (page - 1) * limit;
      const cacheKeyFinal = cacheKey || `${this.cachePrefix}:${table}:${JSON.stringify(req.query)}`;

      // Build base query
      let query = `SELECT ${selectFields}`;
      let countQuery = `SELECT COUNT(*)`;

      // Add joins
      if (joins.length > 0) {
        const joinClause = joins.map(join => 
          `LEFT JOIN ${join.table} ON ${join.condition}`
        ).join(' ');
        query += ` FROM ${table} ${joinClause}`;
        countQuery += ` FROM ${table} ${joinClause}`;
      } else {
        query += ` FROM ${table}`;
        countQuery += ` FROM ${table}`;
      }

      // Add translations join if specified
      if (translations) {
        const translationJoin = `
          LEFT JOIN ${translations.table} ON ${table}.${table.slice(0, -1)}_id = ${translations.table}.${table.slice(0, -1)}_id
          LEFT JOIN languages ON ${translations.table}.language_id = languages.language_id
        `;
        query += translationJoin;
        countQuery += translationJoin;
      }

      // Build WHERE clause
      const { whereClause, params } = this.buildWhereClause(filters, [
        ...filters.map(f => f.field),
        ...(search ? ['search'] : [])
      ]);

      if (whereClause) {
        query += ` ${whereClause}`;
        countQuery += ` ${whereClause}`;
      }

      // Add search
      if (search) {
        const searchCondition = translations ? 
          `AND (${translations.fields.map(field => 
            `${translations.table}.${field} ILIKE $${params.length + 1}`
          ).join(' OR ')})` :
          `AND (${Object.keys(filters).map(field => 
            `${table}.${field} ILIKE $${params.length + 1}`
          ).join(' OR ')})`;
        
        query += searchCondition;
        countQuery += searchCondition;
        params.push(`%${search}%`);
      }

      // Add sorting
      const sortField = sortableFields.includes(sort_by) ? sort_by : defaultSort.split(' ')[0];
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortField} ${sortDirection}`;

      // Add pagination
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      // Execute queries in parallel
      const [dataResult, countResult] = await Promise.all([
        databaseService.query(query, params, { 
          cacheKey: cacheKeyFinal, 
          ttl: cacheTime 
        }),
        databaseService.query(countQuery, params.slice(0, -2), { 
          cacheKey: `${cacheKeyFinal}:count`, 
          ttl: cacheTime 
        })
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Process translations if specified
      let processedData = dataResult.rows;
      if (translations) {
        processedData = this.processTranslations(dataResult.rows, translations.fields);
      }

      return res.json(apiResponseService.paginated(processedData, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }));

    } catch (error) {
      console.error(`Error in getAll for ${table}:`, error);
      return res.status(500).json(apiResponseService.serverError(
        `Failed to fetch ${table}`,
        process.env.NODE_ENV === 'development' ? error.message : null
      ));
    }
  }

  /**
   * Generic GET by ID
   */
  async getById(req, res, options = {}) {
    const {
      table,
      idField = 'id',
      selectFields = '*',
      joins = [],
      translations = null,
      cacheKey = null,
      cacheTime = 300000
    } = options;

    try {
      const { id } = req.params;
      const cacheKeyFinal = cacheKey || `${this.cachePrefix}:${table}:${id}`;

      let query = `SELECT ${selectFields}`;

      // Add joins
      if (joins.length > 0) {
        const joinClause = joins.map(join => 
          `LEFT JOIN ${join.table} ON ${join.condition}`
        ).join(' ');
        query += ` FROM ${table} ${joinClause}`;
      } else {
        query += ` FROM ${table}`;
      }

      // Add translations join if specified
      if (translations) {
        const translationJoin = `
          LEFT JOIN ${translations.table} ON ${table}.${table.slice(0, -1)}_id = ${translations.table}.${table.slice(0, -1)}_id
          LEFT JOIN languages ON ${translations.table}.language_id = languages.language_id
        `;
        query += translationJoin;
      }

      query += ` WHERE ${table}.${idField} = $1`;

      const result = await databaseService.query(query, [id], {
        cacheKey: cacheKeyFinal,
        ttl: cacheTime
      });

      if (result.rows.length === 0) {
        return res.status(404).json(apiResponseService.notFound(table.slice(0, -1), id));
      }

      // Process translations if specified
      let processedData = result.rows[0];
      if (translations && result.rows.length > 0) {
        processedData = this.processTranslations(result.rows, translations.fields)[0];
      }

      return res.json(apiResponseService.success(processedData));

    } catch (error) {
      console.error(`Error in getById for ${table}:`, error);
      return res.status(500).json(apiResponseService.serverError(
        `Failed to fetch ${table.slice(0, -1)}`,
        process.env.NODE_ENV === 'development' ? error.message : null
      ));
    }
  }

  /**
   * Generic CREATE
   */
  async create(req, res, options = {}) {
    const {
      table,
      requiredFields = [],
      optionalFields = [],
      translations = null,
      beforeCreate = null,
      afterCreate = null,
      validation = null
    } = options;

    try {
      const data = req.body;

      // Validate required fields
      const missingFields = requiredFields.filter(field => !data[field]);
      if (missingFields.length > 0) {
        return res.status(400).json(apiResponseService.validationError({
          fields: missingFields.map(field => `${field} is required`)
        }));
      }

      // Custom validation
      if (validation) {
        const validationErrors = await validation(data);
        if (validationErrors && validationErrors.length > 0) {
          return res.status(400).json(apiResponseService.validationError(validationErrors));
        }
      }

      // Before create hook
      if (beforeCreate) {
        await beforeCreate(data);
      }

      // Prepare data for insertion
      const fields = [...requiredFields, ...optionalFields].filter(field => data[field] !== undefined);
      const values = fields.map(field => data[field]);
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

      const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

      const result = await databaseService.query(query, values, { useCache: false });

      const createdItem = result.rows[0];

      // Handle translations
      if (translations && data.translations) {
        await this.saveTranslations(createdItem.id, data.translations, translations);
      }

      // After create hook
      if (afterCreate) {
        await afterCreate(createdItem, data);
      }

      // Clear related cache
      this.clearRelatedCache(table);

      return res.status(201).json(apiResponseService.success(createdItem, 'Created successfully'));

    } catch (error) {
      console.error(`Error in create for ${table}:`, error);
      return res.status(500).json(apiResponseService.serverError(
        `Failed to create ${table.slice(0, -1)}`,
        process.env.NODE_ENV === 'development' ? error.message : null
      ));
    }
  }

  /**
   * Generic UPDATE
   */
  async update(req, res, options = {}) {
    const {
      table,
      idField = 'id',
      allowedFields = [],
      translations = null,
      beforeUpdate = null,
      afterUpdate = null,
      validation = null
    } = options;

    try {
      const { id } = req.params;
      const data = req.body;

      // Custom validation
      if (validation) {
        const validationErrors = await validation(data, id);
        if (validationErrors && validationErrors.length > 0) {
          return res.status(400).json(apiResponseService.validationError(validationErrors));
        }
      }

      // Before update hook
      if (beforeUpdate) {
        await beforeUpdate(data, id);
      }

      // Prepare update fields
      const updateFields = Object.keys(data).filter(field => 
        allowedFields.includes(field) && data[field] !== undefined
      );

      if (updateFields.length === 0) {
        return res.status(400).json(apiResponseService.error('No valid fields to update'));
      }

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const values = updateFields.map(field => data[field]);

      const query = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE ${idField} = $${updateFields.length + 1} RETURNING *`;
      values.push(id);

      const result = await databaseService.query(query, values, { useCache: false });

      if (result.rows.length === 0) {
        return res.status(404).json(apiResponseService.notFound(table.slice(0, -1), id));
      }

      const updatedItem = result.rows[0];

      // Handle translations
      if (translations && data.translations) {
        await this.saveTranslations(id, data.translations, translations);
      }

      // After update hook
      if (afterUpdate) {
        await afterUpdate(updatedItem, data);
      }

      // Clear related cache
      this.clearRelatedCache(table);

      return res.json(apiResponseService.success(updatedItem, 'Updated successfully'));

    } catch (error) {
      console.error(`Error in update for ${table}:`, error);
      return res.status(500).json(apiResponseService.serverError(
        `Failed to update ${table.slice(0, -1)}`,
        process.env.NODE_ENV === 'development' ? error.message : null
      ));
    }
  }

  /**
   * Generic DELETE
   */
  async delete(req, res, options = {}) {
    const {
      table,
      idField = 'id',
      softDelete = false,
      beforeDelete = null,
      afterDelete = null
    } = options;

    try {
      const { id } = req.params;

      // Before delete hook
      if (beforeDelete) {
        await beforeDelete(id);
      }

      let query;
      let params = [id];

      if (softDelete) {
        query = `UPDATE ${table} SET deleted_at = NOW(), updated_at = NOW() WHERE ${idField} = $1 RETURNING *`;
      } else {
        query = `DELETE FROM ${table} WHERE ${idField} = $1 RETURNING *`;
      }

      const result = await databaseService.query(query, params, { useCache: false });

      if (result.rows.length === 0) {
        return res.status(404).json(apiResponseService.notFound(table.slice(0, -1), id));
      }

      // After delete hook
      if (afterDelete) {
        await afterDelete(result.rows[0]);
      }

      // Clear related cache
      this.clearRelatedCache(table);

      return res.json(apiResponseService.success(null, 'Deleted successfully'));

    } catch (error) {
      console.error(`Error in delete for ${table}:`, error);
      return res.status(500).json(apiResponseService.serverError(
        `Failed to delete ${table.slice(0, -1)}`,
        process.env.NODE_ENV === 'development' ? error.message : null
      ));
    }
  }

  /**
   * Build WHERE clause with parameterized queries
   */
  buildWhereClause(filters, allowedFields = []) {
    const conditions = [];
    const params = [];
    let paramCount = 0;

    for (const [field, value] of Object.entries(filters)) {
      if (allowedFields.length > 0 && !allowedFields.includes(field)) continue;
      if (value === null || value === undefined || value === '') continue;

      paramCount++;
      if (Array.isArray(value)) {
        conditions.push(`${field} = ANY($${paramCount})`);
        params.push(value);
      } else if (typeof value === 'string' && value.includes('%')) {
        conditions.push(`${field} ILIKE $${paramCount}`);
        params.push(value);
      } else {
        conditions.push(`${field} = $${paramCount}`);
        params.push(value);
      }
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  /**
   * Process translations data
   */
  processTranslations(rows, translationFields) {
    const grouped = {};
    
    rows.forEach(row => {
      const id = row[Object.keys(row).find(key => key.endsWith('_id'))];
      if (!grouped[id]) {
        grouped[id] = { ...row };
        grouped[id].translations = {};
      }
      
      if (row.language_code) {
        grouped[id].translations[row.language_code] = {};
        translationFields.forEach(field => {
          grouped[id].translations[row.language_code][field] = row[field];
        });
      }
    });

    return Object.values(grouped);
  }

  /**
   * Save translations
   */
  async saveTranslations(itemId, translations, translationConfig) {
    const { table: translationTable, fields } = translationConfig;
    
    // Delete existing translations
    await databaseService.query(
      `DELETE FROM ${translationTable} WHERE ${translationTable.slice(0, -1)}_id = $1`,
      [itemId],
      { useCache: false }
    );

    // Insert new translations
    for (const [languageCode, translationData] of Object.entries(translations)) {
      if (!translationData || Object.values(translationData).every(v => !v)) continue;

      const translationFields = ['language_id', ...fields];
      const values = [languageCode, ...fields.map(field => translationData[field])];
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      await databaseService.query(
        `INSERT INTO ${translationTable} (${translationFields.join(', ')}) VALUES (${placeholders})`,
        values,
        { useCache: false }
      );
    }
  }

  /**
   * Clear related cache
   */
  clearRelatedCache(table) {
    databaseService.clearCache(`${this.cachePrefix}:${table}`);
  }

  /**
   * Create CRUD routes
   */
  createRoutes(router, options) {
    const {
      table,
      basePath = `/${table}`,
      middleware = [],
      ...crudOptions
    } = options;

    // GET all
    router.get(basePath, ...middleware, (req, res) => 
      this.getAll(req, res, { table, ...crudOptions })
    );

    // GET by ID
    router.get(`${basePath}/:id`, ...middleware, (req, res) => 
      this.getById(req, res, { table, ...crudOptions })
    );

    // CREATE
    router.post(basePath, ...middleware, (req, res) => 
      this.create(req, res, { table, ...crudOptions })
    );

    // UPDATE
    router.put(`${basePath}/:id`, ...middleware, (req, res) => 
      this.update(req, res, { table, ...crudOptions })
    );

    // DELETE
    router.delete(`${basePath}/:id`, ...middleware, (req, res) => 
      this.delete(req, res, { table, ...crudOptions })
    );

    return router;
  }
}

module.exports = new CrudService();
