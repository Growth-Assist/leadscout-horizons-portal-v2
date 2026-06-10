const BASE_URL = 'https://poc.growth-assist.co.uk';

class ApiService {
  async fetchBriefs() {
    try {
      const response = await fetch(`${BASE_URL}/outputs/briefs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch briefs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching briefs:', error);
      throw error;
    }
  }

  async fetchScores() {
    try {
      const response = await fetch(`${BASE_URL}/outputs/scores`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scores: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching scores:', error);
      throw error;
    }
  }

  async fetchICPProfile() {
    try {
      const response = await fetch(`${BASE_URL}/outputs/icp-profile`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICP profile: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching ICP profile:', error);
      throw error;
    }
  }

  async fetchExports() {
    try {
      const response = await fetch(`${BASE_URL}/outputs/exports`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exports: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching exports:', error);
      throw error;
    }
  }

  async fetchBriefDetail(companyId) {
    try {
      const response = await fetch(`${BASE_URL}/outputs/brief/${companyId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch brief detail: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching brief detail:', error);
      throw error;
    }
  }

  getBriefHtmlUrl(filename) {
    return `${BASE_URL}/briefs/html/${filename}`;
  }

  getBriefPdfUrl(filename) {
    return `${BASE_URL}/briefs/pdf/${filename}`;
  }

  getExportFileUrl(filename) {
    return `${BASE_URL}/exports/${filename}`;
  }
}

const apiService = new ApiService();
export default apiService;