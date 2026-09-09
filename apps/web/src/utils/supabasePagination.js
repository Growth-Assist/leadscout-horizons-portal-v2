export const fetchAllSupabasePages = async (fetchPage, pageSize = 1000) => {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
};
