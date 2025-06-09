export const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.warn(`Retry ${i + 1}/${retries} failed: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };