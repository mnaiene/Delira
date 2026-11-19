module.exports = function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro interno no servidor' });
      }
    });
  };
};
