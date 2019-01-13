// NodeBB Plugin Modmin

const async = require('async')

const User = require.main.require('./src/user')
const Privileges = require.main.require('./src/privileges')
const Helpers = require.main.require('./src/privileges/helpers')
const Categories = require.main.require('./src/categories')
const Groups = require.main.require('./src/groups')
const Events = require.main.require('./src/events')
const SocketPlugins = require.main.require('./src/socket.io/plugins')

const defaultPrivileges = [
  'find',
  'read',
  'topics:read',
  'topics:create',
  'topics:reply',
  'topics:tag',
  'posts:edit',
  'posts:history',
  'posts:delete',
  'posts:upvote',
  'posts:downvote',
  'topics:delete',
]

exports.load = function ({ app, middleware, router }, next) {

  // Render the modmin page if the user has the "Manage Category" permission anywhere.
  function render (req, res, next) {
    let uid = req.uid
    let cid = req.params.cid ? parseInt(req.params.cid, 10) : 0
    let isAdmin
    let isGroupAssigner

    async.waterfall([
      async.apply(Categories.getAllCidsFromSet, 'categories:cid'),
      (cids, next) => {
        cids.unshift(0)

        async.waterfall([
          (next) => User.isAdministrator(uid, next),
          (_isAdmin, next) => {
            isAdmin = _isAdmin
            if (isAdmin) return next(null, cids)

            Helpers.isUserAllowedTo('modmin', uid, cids, (err, isAllowed) => {
              if (err) return next(err)

              cids = cids.filter((key, index) => isAllowed[index])

              if (!cids.length) return res.redirect('/')
              if (!cid || cids.indexOf(`${cid}`) === -1) cid = parseInt(cids[0], 10)

              next(null, cids)
            })
          },
        ], next)
      },
      (cids, next) => {
        async.waterfall([
          (next) => {
            isAdminOrGroupAssigner(cid, uid, (err, _isGroupAssigner) => {
              isGroupAssigner = _isGroupAssigner
              next()
            })
          },
          function (next) {
            async.parallel({
              privileges: function (next) {
                if (!cid) {
                  Privileges.global.list(next)
                } else {
                  Privileges.categories.list(cid, next)
                }
              },
              categories: function (next) {
                async.waterfall([
                  function (next) {
                    Categories.getCategories(cids, uid, next)
                  },
                  function (categoriesData, next) {
                    categoriesData = Categories.getTree(categoriesData)
                    Categories.buildForSelectCategories(categoriesData, next)
                  },
                ], next)
              },
            }, next)
          },
          function (data) {
            if (!!~cids.indexOf(0)) data.categories.unshift({
              cid: 0,
              name: '[[admin/manage/privileges:global]]',
              icon: 'fa-list',
            })

            // Filter privileges.
            data.categories.forEach(function (category) {
              if (category) {
                category.selected = category.cid === cid

                if (category.selected) {
                  data.selected = category
                }
              }
            })

            data.privileges.labels.users = [
              {name: "[[admin/manage/privileges:moderate]]"},
              {name:	"Manage Category"},
            ]

            Object.keys(data.privileges.users).forEach(uid => {
              data.privileges.users[uid].privileges = {
                moderate: data.privileges.users[uid].privileges.moderate,
                modmin: data.privileges.users[uid].privileges.modmin,
              }
            })

            res.render('modmin/category', {
              title: 'Moderator Management Panel',
              privileges: data.privileges,
              categories: data.categories,
              selectedCategory: data.selected,
              cid,
              isGroupAssigner: isGroupAssigner ? 'true' : '',
            })
          },
        ], next)
      },
    ])
  }

  // All possible routes.
  router.get('/modmin', middleware.buildHeader, render)
  router.get('/api/modmin', render)
  router.get('/modmin/category', middleware.buildHeader, render)
  router.get('/api/modmin/category', render)
  router.get('/modmin/category/:cid', middleware.buildHeader, render)
  router.get('/api/modmin/category/:cid', render)
  router.get('/modmin/category/:cid/:slug', middleware.buildHeader, render)
  router.get('/api/modmin/category/:cid/:slug', render)

  SocketPlugins.modmin = { categories: {} }

  SocketPlugins.modmin.categories.getPrivilegeSettings = socketMethod((socket, {cid}, callback) => {
    async.waterfall([
      (next) => {
        if (!cid) {
          Privileges.global.list(next)
        } else {
          Privileges.categories.list(cid, next)
        }
      },
      (privileges, next) => {
        privileges.labels.users = [
          {name: "[[admin/manage/privileges:moderate]]"},
          {name:	"Manage Category"},
        ]

        Object.keys(privileges.users).forEach(uid => {
          privileges.users[uid].privileges = {
            moderate: privileges.users[uid].privileges.moderate,
            modmin: privileges.users[uid].privileges.modmin,
          }
        })

        next(null, privileges)
      },
    ], callback)
  })

  SocketPlugins.modmin.categories.setPrivilege = socketMethod((socket, data, callback) => {
    const cid = data.cid
    const uid = socket.uid

    if (!data) return callback(new Error('[[error:invalid-data]]'))

    // Modmins can't modify groups privileges.
    if (!(parseInt(data.member, 10) && parseInt(data.member, 10)+'' === data.member+'')) return callback(new Error('[[error:not-authorized]]'))

    // Modmins can't set global privileges.
    if (!cid) return callback(new Error('[[error:not-authorized]]'))

    if (Array.isArray(data.privilege)) {
      if (!data.set) return next(new Error('[[error:not-authorized]]'))

      async.each(data.privilege, function (privilege, next) {
        if (!(privilege === 'modmin' ||
              privilege === 'moderate')) return next()

        if (privilege === 'modmin' && uid === parseInt(data.member,10)) {
          if (data.privilege.length === 1) {
            return callback(new Error(`Can't revoke your own Manage privilege.`))
          } else {
            return next()
          }
        }

        Groups[data.set ? 'join' : 'leave']('cid:' + data.cid + ':privileges:' + privilege, data.member, next)
      }, onSetComplete)
    } else {
      // Only allow modmin and moderate changes.
      if (!(data.privilege === 'modmin' || data.privilege === 'moderate')) return callback(new Error('[[error:not-authorized]]'))

      if (data.privilege === 'modmin' && uid === parseInt(data.member,10)) {
        return callback(new Error(`Can't revoke your own Manage privilege.`))
      }

      Groups[data.set ? 'join' : 'leave']('cid:' + data.cid + ':privileges:' + data.privilege, data.member, onSetComplete)
    }

    function onSetComplete(err) {
      if (err) return callback(err)

      Events.log({
        uid: socket.uid,
        type: 'privilege-change',
        ip: socket.ip,
        privilege: data.privilege.toString(),
        cid: data.cid,
        action: data.set ? 'grant' : 'rescind',
        target: data.member,
      }, callback)
    }
  })

  SocketPlugins.modmin.categories.copyPrivilegesToChildren = socketMethod((socket, data, callback) => {
    const {uid} = socket
    const {cid} = data

    return callback(new Error('[[error:not-authorized]]'))

    async.waterfall([
      function (next) {
        Categories.getChildren([cid], socket.uid, next)
      },
      function (children, next) {
        children = children[0]

        async.eachSeries(children, function (child, next) {
          isAdminOrModmin(child.cid, uid, (err, isAdminOrModmin) => {
            if (err || !isAdminOrModmin) return next()

            copyPrivilegesToChildrenRecursive(cid, child, next)
          })
        }, next)
      },
    ], callback)

    function copyPrivilegesToChildrenRecursive(parentCid, category, callback) {
      async.waterfall([
        function (next) {
          Categories.copyPrivilegesFrom(parentCid, category.cid, next)
        },
        function (next) {
          async.eachSeries(category.children, function (child, next) {
            isAdminOrModmin(child.cid, uid, (err, isAdminOrModmin) => {
              if (err || !isAdminOrModmin) return next()

              copyPrivilegesToChildrenRecursive(parentCid, child, next)
            })
          }, next)
        },
      ], callback)
    }
  })

  SocketPlugins.modmin.categories.copyPrivilegesFrom = (socket, {toCid, fromCid}, callback) => {
    const uid = socket.uid

    // Don't manage group privileges.
    return callback(new Error('[[error:not-authorized]]'))

    async.every([fromCid, toCid], (cid, next) => isAdminOrModmin(cid, uid, next), (err, isAdminOrModmin) => {
      if (err || !isAdminOrModmin) return callback(new Error('[[error:not-authorized]]'))

      Categories.copyPrivilegesFrom(fromCid, toCid, callback)
    })
  }

  SocketPlugins.modmin.categories.addSubcategory = socketMethod((socket, data, callback) => {
    const cid = data.cid
    const uid = socket.uid
    let category = {}

    let fields = data.data
    let owner = data.owner
    let userTitleEnabled = data.userTitleEnabled ? 1 : 0
    let group = data.group ? 1 : 0

    fields.parentCid = cid

    async.waterfall([
      async.apply(Categories.create, fields),
      (_category, next) => {
        category = _category

        group = group ? category.name : false

        // Don't copy global privs.
        if (!cid) return next()

        // Copy parent.
        Categories.copyPrivilegesFrom(cid, category.cid, next)
      },
      (next) => {
        if (!owner) {
          async.parallel([
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:modmin', uid),
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:moderate', uid),
          ], err => next(err))
        } else {
          async.parallel([
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:modmin', owner),
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:moderate', owner),
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:modmin', uid),
            async.apply(Groups.join, 'cid:' + category.cid + ':privileges:moderate', uid),
          ], err => next(err))
        }
      },
      (next) => {
        if (!group) {
          next()
        } else {
          isAdminOrGroupAssigner(cid, uid, (err, isGroupAssigner) => {
            if (err) return next(err)
            if (!isGroupAssigner) return next()

            async.parallel([
              async.apply(Groups.create, {name: group, ownerUid: owner || uid, userTitleEnabled}),
              async.apply(Privileges.categories.give, defaultPrivileges, [category.cid], [group]),
              async.apply(Privileges.categories.rescind, defaultPrivileges, [category.cid], ['registered-users', 'guests', 'spiders']),
            ], err => next(err))
          })
        }
      },
    ], (err) => callback(err, category.cid))
  })

  SocketPlugins.modmin.categories.editCategory = socketMethod((socket, data, callback) => {
    const cid = data.cid

    let modified = {}

    modified[cid] = data.data

    Categories.update(modified, callback)
  })

  SocketPlugins.modmin.categories.addGroup = socketMethod((socket, data, callback) => {
    const {cid, name} = data
    const {uid} = socket

    Groups.create({
      name,
      ownerUid: uid
    }, (err, group) => {
      if (err) return callback(err)

      SocketPlugins.modmin.categories.setPrivilege({uid}, {
        cid: cid,
        privilege: ['groups:find', 'groups:read', 'groups:topics:read'],
        set: true,
        member: group.name,
      }, callback)
    })
  })

  next()
}

exports.addPrivileges = (privileges, next) => {
  privileges.push('modmin')
  privileges.push('assigngroups')
  next(null, privileges)
}

exports.addPrivilegesHuman = (privileges, next) => {
  privileges.push({name: 'Manage Category'})
  privileges.push({name: 'Assign Groups'})
  next(null, privileges)
}

exports.addPrivilegesGroups = (privileges, next) => {
  privileges.push('groups:modmin')
  privileges.push('groups:assigngroups')
  next(null, privileges)
}

exports.copyPrivilegesFrom = (data, next) => {
  data.privileges.push('modmin')
  data.privileges.push('assigngroups')
  next(null, data)
}

function socketMethod (method) {
  return (socket, data, callback) => {
    const cid = data.cid
    const uid = socket.uid

    isAdminOrModmin(cid, uid, (err, isAdminOrModmin) => {
      if (err) return callback(err)
      if (!isAdminOrModmin) return callback(new Error('[[error:not-authorized]]'))
      method(socket, data, callback)
    })
  }
}

function isAdminOrModmin (cid, uid, callback) {
  async.parallel({
    isAdmin(next) { User.isAdministrator(uid, next) },
    isModmin(next) {
      Helpers.isUserAllowedTo('modmin', uid, [cid], (err, isAllowed) => next(err, isAllowed ? isAllowed[0] : false))
    },
    isGmod(next) {
      Helpers.isUserAllowedTo('modmin', 'Global Moderators', [cid], next)
    },
  }, (err, results) => {
    callback(err, err ? false : results.isAdmin || results.isModmin)
  })
}

function isAdminOrGroupAssigner (cid, uid, callback) {
  async.parallel({
    isAdmin(next) { User.isAdministrator(uid, next) },
    isGroupAssigner(next) {
      Helpers.isUserAllowedTo('assigngroups', uid, [cid], (err, isAllowed) => next(err, isAllowed ? isAllowed[0] : false))
    },
  }, (err, results) => callback(err, err ? false : results.isAdmin || results.isGroupAssigner))
}
