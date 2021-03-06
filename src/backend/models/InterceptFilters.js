const DEFAULT_FILTERS = {
  enabled: true,
  hostList: [],
  hostSetting: '',
  pathList: [],
  pathSetting: '',
  extList: [],
  extSetting: '',
  resourceTypes: [
    'document',
    'eventsource',
    'fetch',
    'font',
    'image',
    'manifest',
    'media',
    'navigation',
    'other',
    'stylesheet',
    'script',
    'texttrack',
    'websocket',
    'xhr'
  ]
};

export default class InterceptFilters {
  static async getFilters() {
    let result = await global
      .knex('intercept_filters')
      .where({ id: 1 })
      .select();

    if (result.length === 0) {
      console.log(`No intercept_filters found, so creating default..`);
      await this.createDefault();
      result = await global
        .knex('intercept_filters')
        .where({ id: 1 })
        .select();
    }

    return JSON.parse(result[0].filters);
  }

  static async createDefault() {
    console.log('Creating default InterceptFilters...');
    const defaultFilters = JSON.stringify(DEFAULT_FILTERS);
    return global
      .knex('intercept_filters')
      .insert({ id: 1, filters: defaultFilters });
  }
}
