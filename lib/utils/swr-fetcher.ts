import api from './api';

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export const fetcherWithParams = ([url, params]: [string, any]) => 
  api.get(url, { params }).then(res => res.data);
