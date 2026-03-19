import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001", // Sua URL do NestJS
});

api.interceptors.request.use(
  (config) => {
    const savedUser = localStorage.getItem("@payvex:user");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        console.error("Erro ao dar parse no usuário do localStorage", e);
      }
    } else {
      // 🚨 Se cair aqui, você precisa deslogar o usuário ou redirecionar para o login
      console.warn("Sessão expirada ou usuário não logado.");
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    console.log(`[AXIOS SUCCESS] URL: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(
      `[AXIOS ERROR] URL: ${error.config?.url}`,
      error.response?.data || error.message,
    );
    return Promise.reject(error);
  },
);
