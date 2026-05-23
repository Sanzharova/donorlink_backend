const permit = (allowedRoles) => {
  return (req, res, next) => {
    const { user } = req;
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const hasPermission = user.roles.some((role) =>
      allowedRoles.includes(role)
    );
    if (!hasPermission) {
      res.status(403).send({ error: 'Forbidden' });
      return;
    }
    next();
  };
};

export default permit;
