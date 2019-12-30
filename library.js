// NodeBB Plugin Modmin

const async = require('async')

const User = require.main.require('./src/user')
const Privileges = require.main.require('./src/privileges')
const Helpers = require.main.require('./src/privileges/helpers')
const Categories = require.main.require('./src/categories')
const Database = require.main.require('./src/database')
const Groups = require.main.require('./src/groups')
const Events = require.main.require('./src/events')
const SocketPlugins = require.main.require('./src/socket.io/plugins')
const SocketAdmin = require.main.require('./src/socket.io/admin')
const Settings = require.main.require('./src/settings')
const events = require.main.require('./src/events')
const notifications = require.main.require('./src/notifications')

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

let settings

exports.load = function ({ app, middleware, router }, next) {
  settings = new Settings('modmin', '1.0.0', {}, loadSettings)

  function loadSettings () {
    // DEBUG
    // console.dir(settings.get())
  }

  SocketAdmin.settings.syncModmin = function () {
    settings.sync(loadSettings)
  }

  // Render the modmin page if the user has the "Manage Category" permission anywhere.
  function render (req, res, next) {
    let uid = req.uid
    let cid = req.params.cid ? parseInt(req.params.cid, 10) : 0
    let isAdmin
    let isGroupAssigner
    let canDelete

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
          (next) => {
            isAdminOrCanDelete(cid, uid, (err, _canDelete) => {
              canDelete = _canDelete
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
                    Categories.getCategoriesData(cids, next)
                  },
                  function (categoriesData, next) {
                    categoriesData = Categories.getTree(categoriesData)
                    categoriesData = Categories.buildForSelectCategories(categoriesData)
                    next(null, categoriesData)
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

            Privileges.userPrivilegeList.slice().reverse().forEach((priv, i) => {
              if (priv === 'moderate') return
              if (!settings.get(priv)) {
                data.privileges.labels.users.splice(Privileges.userPrivilegeList.indexOf(priv), 1)
                Object.keys(data.privileges.users).forEach(uid => {
                  delete data.privileges.users[uid].privileges[priv]
                })
              }
            })
            
            Privileges.groupPrivilegeList.slice().reverse().forEach((priv, i) => {
              if (priv === 'groups:moderate') return
              if (!settings.get(priv)) {
                data.privileges.labels.groups.splice(Privileges.groupPrivilegeList.indexOf(priv), 1)
                Object.keys(data.privileges.groups).forEach(group => {
                  delete data.privileges.groups[group].privileges[priv]
                })
              }
            })
            

            // Assign groups is admin only.
            data.privileges.labels.users.splice(data.privileges.labels.users.indexOf('assigngroups'), 1)
            Object.keys(data.privileges.users).forEach(uid => {
              delete data.privileges.users[uid].privileges['assigngroups']
            })
            data.privileges.labels.groups.splice(data.privileges.labels.groups.indexOf('assigngroups'), 1)
            
            Object.keys(data.privileges.groups).forEach(group => {
              delete data.privileges.groups[group].privileges['groups:assigngroups']
            })

            res.render('modmin/category', {
              title: 'Moderator Management Panel',
              privileges: data.privileges,
              categories: data.categories,
              selectedCategory: data.selected,
              cid,
              isGroupAssigner: isGroupAssigner ? 'true' : '',
              canDelete: canDelete ? 'true' : '',
              canManageGroups: !settings.get('manage-groups'),
              isGlobal: cid==0 ? 'true' : '',
              forceOwner: (!settings.get('force-owner') || isGroupAssigner || cid!=0) ? '' : 'true',
            })
          },
        ], next)
      },
    ])
  }

  // Config page.
  function renderConfig (req, res, next) {
    let userPrivileges = Privileges.userPrivilegeList.slice()
    let PrivilegesLabels = Privileges.privilegeLabels.slice()
    let groupPrivileges = Privileges.groupPrivilegeList.slice()
    userPrivileges.pop()
    PrivilegesLabels.pop()
    groupPrivileges.pop()
    res.render('modmin/config', {
      userPrivileges,
      PrivilegesLabels,
      groupPrivileges
    })
  }

  // All possible routes.
  router.get('/modmin', middleware.buildHeader, render)
  router.get('/api/modmin', render)
  router.get('/modmin/category', middleware.buildHeader, render)
  router.get('/api/modmin/category', render)
  router.get('/modmin/category/:cid', middleware.buildHeader, render)
  router.get('/api/modmin/category/:cid', render)
  router.get('/modmin/category/:cid/:slug', middleware.buildHeader, render)
  router.get('/api/admin/plugins/modmin', renderConfig)
  router.get('/admin/plugins/modmin', middleware.admin.buildHeader, renderConfig)

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
        Privileges.userPrivilegeList.slice().reverse().forEach((priv, i) => {
          if (priv === 'moderate') return
          if (!settings.get(priv)) {
            privileges.labels.users.splice(Privileges.userPrivilegeList.indexOf(priv), 1)
            Object.keys(privileges.users).forEach(uid => {
              delete privileges.users[uid].privileges[priv]
            })
          }
        })

        // Assign groups is admin only.
        privileges.labels.users.splice(privileges.labels.users.indexOf('assigngroups'), 1)
        Object.keys(privileges.users).forEach(uid => {
          delete privileges.users[uid].privileges['assigngroups']
        })

        next(null, privileges)
      },
    ], callback)
  })

  SocketPlugins.modmin.categories.setPrivilege = socketMethod((socket, data, callback) => {
    const cid = data.cid
    const uid = socket.uid

    if (!data) return callback(new Error('[[error:invalid-data]]'))

    // Modmins can modify groups privileges, unless the setting is changes :)
    if (!(parseInt(data.member, 10) && parseInt(data.member, 10)+'' === data.member+'') && !settings.get('manage-groups')) return callback(new Error('[[error:not-authorized]]'))

    // Modmins can't set global privileges.
    if (!cid) return callback(new Error('[[error:not-authorized]]'))

    if (Array.isArray(data.privilege)) {
      if (!data.set) return next(new Error('[[error:not-authorized]]'))

      async.each(data.privilege, function (privilege, next) {
        if (!(settings.get(privilege) || 
              privilege === 'modmin' ||
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
      if (!(settings.get(data.privilege) || data.privilege === 'modmin' || data.privilege === 'moderate')) return callback(new Error('[[error:not-authorized]]'))

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

    if (!settings.get('manage-groups')) return callback(new Error('[[error:not-authorized]]'))

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
    if (settings.get('manage-groups')) return callback(new Error('[[error:not-authorized]]'))

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
              async.apply(Database.setObjectField, 'modmin:cid:group', `${category.cid}`, group),
            ], (err) => next(err))
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

  // Make user the owner and create is not already created.
  SocketPlugins.modmin.categories.addGroup = socketMethod((socket, data, callback) => {
    const {cid} = data
    const {uid} = socket

    isAdminOrGroupAssigner(cid, uid, (err, isGroupAssigner) => {
      if (err) return callback(err)
      if (!isGroupAssigner) return callback(new Error('[[error:not-authorized]]'))

      let group

      async.waterfall([
        (next) => {
          Categories.getCategoryField(cid, 'name', next)
        },
        (_name, next) => {
          group = _name
          Groups.exists(group, next)
        },
        (exists, next) => {
          if (exists) {
            Groups.ownership.grant(uid, group, next)
          } else {
            async.parallel([
              async.apply(Groups.create, {name: group, ownerUid: uid}),
              async.apply(Privileges.categories.give, defaultPrivileges, [cid], [group]),
              async.apply(Privileges.categories.rescind, defaultPrivileges, [cid], ['registered-users', 'guests', 'spiders']),
              async.apply(Database.setObjectField, 'modmin:cid:group', `${cid}`, group),
            ], (err) => next(err))
          }
        },
      ], callback)
    })
  })

  SocketPlugins.modmin.categories.deleteCategory = socketMethod((socket, data, callback) => {
    const {cid} = data
    const {uid, ip} = socket

    isAdminOrCanDelete(cid, uid, (err, canDelete) => {
      if (err) return callback(err)
      if (!canDelete) return callback(new Error('[[error:not-authorized]]'))
      if(!settings.get('delete-or-disable')) {
        async.waterfall([
          async () => {
          return await Categories.update({[cid]:{disabled:1}})
          },
          async () => {
            return await Groups.leave('cid:' + cid + ':privileges:modmin', uid)
          }
        ], callback)
      }
      else {
        async.waterfall([
          async () =>  {
            const name = await Categories.getCategoryField(cid, 'name')
            return await events.log({
              type: 'category-purge',
              uid: uid,
              ip: ip,
              cid: cid,
              name: name,
            })
          },
          async () => {
            return await Categories.purge(cid, uid)
          }], callback)
      }

    })
  })

  SocketPlugins.modmin.categories.addCategory = socketMethod((socket, data, callback) => {
    const uid = socket.uid
    let category = {}

    let fields = data.data
    let owner = !!data.owner ? data.owner : data.uid
    let userTitleEnabled = data.userTitleEnabled ? 1 : 0
    let group = data.group ? 1 : 0
    let rescindDefault = data.rescindDefault ? 1 : 0
    async.waterfall([
      async.apply(Categories.create, fields),
      (_category, next) => {
        category = _category
        group = group ? category.name : false

        // Don't copy privs
        next()

      },
      (next) => {
        let isAdmin = false
        User.isAdminOrGlobalMod(uid, (err, result) => {
          if(!err) {
            isAdmin = result
          }
        })
        if (!isAdmin && settings.get('disable-on-creation')) {
          notifications.create({
            type: 'post-queue',
            bodyShort: `[[modmin:new_category, ${category.name}, ${category.cid}]]`,
            nid: 'new_category:' + category.name,
            path: '/admin/manage/categories',
            mergeId: 'new_category',
          }, (err, notifObj) => {
            if(err) {
              next(err)
            }
            else {
              notifications.pushGroup(notifObj, 'administrators', (err) => {
                if (err) {
                  next(err)
                }
                else {
                  Categories.update({[category.cid]:{disabled:1}}, (err) => {
                    if (err) {
                      next(err)
                    }
                    else {
                      next()
                    }
                  })
                }
              })
            }
          });
          
        }
        else {
          next()
        }
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
        isAdminOrGroupAssigner(0, uid, (err, isGroupAssigner) => {
          if (err) return next(err)
          if (!isGroupAssigner) {
            if (!settings.get('force-group')) {
              return next()
            }
            group = category.name
            userTitleEnabled = !!settings.get('force-group-title')
            if (!settings.get('force-owner')) {
              owner = uid
            }
            rescindDefault = settings.get('rescind-defaults')
          }
          async.parallel([
            async.apply(Groups.create, {name: group, ownerUid: owner || uid, userTitleEnabled}),
            async.apply(Privileges.categories.give, defaultPrivileges, [category.cid], [group]),
            async.apply(Privileges.categories.rescind, defaultPrivileges, [category.cid], rescindDefault ? ['registered-users', 'guests', 'spiders'] : []),
            async.apply(Database.setObjectField, 'modmin:cid:group', `${category.cid}`, group),
          ], (err) => next(err))
        })
      }
    ], (err) => callback(err, {cid:category.cid, disabled:settings.get('disable-on-creation')}))
  })

  next()
}

exports.addPrivileges = (privileges, next) => {
  privileges.push('modmin')
  privileges.push('assigngroups')
  privileges.push('deletecategories')
  next(null, privileges)
}

exports.addPrivilegesHuman = (privileges, next) => {
  privileges.push({name: 'Manage Category'})
  privileges.push({name: 'Assign Groups'})
  privileges.push({name: "Delete Category"})
  next(null, privileges)
}

exports.addPrivilegesGroups = (privileges, next) => {
  privileges.push('groups:modmin')
  privileges.push('groups:assigngroups')
  privileges.push('groups:deletecategories')
  next(null, privileges)
}

exports.copyPrivilegesFrom = (data, next) => {
  data.privileges.push('modmin')
  data.privileges.push('assigngroups')
  data.privileges.push('deletecategories')
  next(null, data)
}

exports.categoryUpdate = (data) => {
  if (!data.modified.name) return

  Database.getObjectField('modmin:cid:group', `${data.cid}`, (err, group) => {
    if (err || !group) return

    async.parallel([
      async.apply(Groups.renameGroup, group, data.modified.name),
      async.apply(Database.setObjectField, 'modmin:cid:group', `${data.cid}`, data.modified.name),
    ], err => {
      if (err) console.log('Error renaming assigned group: ' + group)
    })
  })
}

exports.groupRename = (data) => {
  Database.getObject('modmin:cid:group', (err, object) => {
    if (err || !object) return

    let fields = Object.keys(object)
    let values = Object.values(object)

    let i = values.indexOf(data.old)

    if (i === -1) return

    async.parallel([
      async.apply(Categories.update, {[fields[i]]: {name: data.new}}),
      async.apply(Database.setObjectField, 'modmin:cid:group', `${fields[i]}`, data.new),
    ], err => {
      if (err) console.log('Error renaming assigned cid: ' + fields[i])
    })
  })
}

exports.adminHeader = (data, callback) => {
  data.plugins.push({
    'route': '/plugins/modmin',
    'icon': '',
    'name': 'Modmin'
  })

  callback(null, data)
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

function isAdminOrCanDelete (cid, uid, callback) {
  async.parallel({
    isAdmin(next) { User.isAdministrator(uid, next) },
    canDelete(next) {
      Helpers.isUserAllowedTo('deletecategories', uid, [cid], (err, isAllowed) => next(err, isAllowed ? isAllowed[0] : false))
    },
  }, (err, results) => callback(err, err ? false : results.isAdmin || results.canDelete))
}