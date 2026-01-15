// Middleware untuk proteksi rute admin
function requireAuth(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    } else {
        return res.redirect('/admin/login');
    }
}

// Middleware untuk redirect jika sudah login
function redirectIfAuth(req, res, next) {
    if (req.session && req.session.admin) {
        return res.redirect('/admin/dashboard');
    } else {
        return next();
    }
}

module.exports = { requireAuth, redirectIfAuth };