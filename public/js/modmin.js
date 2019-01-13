// Modmin category client script.
define('forum/modmin/category', [
  'autocomplete',
  'translator',
  'benchpress',
  'categorySelector',
  'admin/modules/colorpicker',
  'uploader',
  'iconSelect',
], function (autocomplete, translator, Benchpress, categorySelector, colorpicker, uploader, iconSelect) {
  let Modmin = {}

  let cid

  Modmin.init = function () {
    cid = ajaxify.data.cid || 0

    categorySelector.init($('[component="category-selector"]'), function (category) {
      let cid = parseInt(category.cid, 10)
      ajaxify.go('modmin/category/' + (cid || ''))
    })

    Modmin.setupPrivilegeTable()
  }

  Modmin.setupPrivilegeTable = function () {
    $('.privilege-table-container').on('change', 'input[type="checkbox"]', function () {
      let checkboxEl = $(this)
      let privilege = checkboxEl.parent().attr('data-privilege')
      let state = checkboxEl.prop('checked')
      let rowEl = checkboxEl.parents('tr')
      let member = rowEl.attr('data-group-name') || rowEl.attr('data-uid')
      let isPrivate = parseInt(rowEl.attr('data-private') || 0, 10)
      let isGroup = rowEl.attr('data-group-name') !== undefined

      if (member) {
        if (isGroup && privilege === 'groups:moderate' && !isPrivate && state) {
          bootbox.confirm('[[admin/manage/categories:alert.confirm-moderate]]', function (confirm) {
            if (confirm) {
              Modmin.setPrivilege(member, privilege, state, checkboxEl)
            } else {
              checkboxEl.prop('checked', !checkboxEl.prop('checked'))
            }
          })
        } else {
          Modmin.setPrivilege(member, privilege, state, checkboxEl)
        }
      } else {
        app.alertError('[[error:invalid-data]]')
      }
    })

    $('.privilege-table-container').on('click', '[data-action="search.user"]', Modmin.addUserToPrivilegeTable)
    $('.privilege-table-container').on('click', '[data-action="search.group"]', Modmin.addGroupToPrivilegeTable)
    $('.privilege-table-container').on('click', '[data-action="copyToChildren"]', Modmin.copyPrivilegesToChildren)
    $('.privilege-table-container').on('click', '[data-action="copyPrivilegesFrom"]', Modmin.copyPrivilegesFromCategory)

    $('[data-action="addSubcategory"]').click(Modmin.addSubcategory)
    $('[data-action="editCategory"]').click(Modmin.editCategory)
    $('[data-action="addGroup"]').click(Modmin.addGroup)

    Modmin.exposeAssumedPrivileges()
  }

  Modmin.refreshPrivilegeTable = function () {
    socket.emit('plugins.modmin.categories.getPrivilegeSettings', {cid: parseInt(cid, 10)}, function (err, privileges) {
      if (err) {
        return app.alertError(err.message)
      }
      let tpl = cid ? 'admin/partials/categories/privileges' : 'admin/partials/global/privileges'
      Benchpress.parse(tpl, {
        privileges: privileges,
      }, function (html) {
        translator.translate(html, function (html) {
          $('.privilege-table-container').html(html)
          Modmin.exposeAssumedPrivileges()
        })
      })
    })
  }

  Modmin.exposeAssumedPrivileges = function () {
    /*
      If registered-users has a privilege enabled, then all users and groups of that privilege
      should be assumed to have that privilege as well, even if not set in the db, so reflect
      this arrangement in the table
    */
    let privs = []
    $('.privilege-table tr[data-group-name="registered-users"] td input[type="checkbox"]').parent().each(function (idx, el) {
      if ($(el).find('input').prop('checked')) {
        privs.push(el.getAttribute('data-privilege'))
      }
    })
    for (let x = 0, numPrivs = privs.length; x < numPrivs; x += 1) {
      let inputs = $('.privilege-table tr[data-group-name]:not([data-group-name="registered-users"],[data-group-name="guests"]) td[data-privilege="' + privs[x] + '"] input')
      inputs.each(function (idx, el) {
        if (!el.checked) {
          el.indeterminate = true
        }
      })
    }
  }

  Modmin.setPrivilege = function (member, privilege, state, checkboxEl) {
    socket.emit('plugins.modmin.categories.setPrivilege', {
      cid: cid,
      privilege: privilege,
      set: state,
      member: member,
    }, function (err) {
      if (err) {
        Modmin.refreshPrivilegeTable()
        return app.alertError(err.message)
      }

      checkboxEl.replaceWith('<i class="fa fa-spin fa-spinner"></i>')
      Modmin.refreshPrivilegeTable()
    })
  }

  Modmin.addUserToPrivilegeTable = function () {
    let modal = bootbox.dialog({
      title: '[[admin/manage/categories:alert.find-user]]',
      message: '<input class="form-control input-lg" placeholder="[[admin/manage/categories:alert.user-search]]" />',
      show: true,
    })

    modal.on('shown.bs.modal', function () {
      let inputEl = modal.find('input')

      autocomplete.user(inputEl, function (ev, ui) {
        let defaultPrivileges = cid ? ['moderate'] : ['chat']
        socket.emit('plugins.modmin.categories.setPrivilege', {
          cid: cid,
          privilege: defaultPrivileges,
          set: true,
          member: ui.item.user.uid,
        }, function (err) {
          if (err) {
            return app.alertError(err.message)
          }

          Modmin.refreshPrivilegeTable()
          modal.modal('hide')
        })
      })
    })
  }

  Modmin.addGroupToPrivilegeTable = function () {
    let modal = bootbox.dialog({
      title: '[[admin/manage/categories:alert.find-group]]',
      message: '<input class="form-control input-lg" placeholder="[[admin/manage/categories:alert.group-search]]" />',
      show: true,
    })

    modal.on('shown.bs.modal', function () {
      let inputEl = modal.find('input')

      autocomplete.group(inputEl, function (ev, ui) {
        let defaultPrivileges = cid ? ['groups:find', 'groups:read', 'groups:topics:read'] : ['groups:chat']
        socket.emit('plugins.modmin.categories.setPrivilege', {
          cid: cid,
          privilege: defaultPrivileges,
          set: true,
          member: ui.item.group.name,
        }, function (err) {
          if (err) {
            return app.alertError(err.message)
          }

          Modmin.refreshPrivilegeTable()
          modal.modal('hide')
        })
      })
    })
  }

  Modmin.copyPrivilegesToChildren = function () {
    socket.emit('plugins.modmin.categories.copyPrivilegesToChildren', {cid: cid}, function (err) {
      if (err) return app.alertError(err.message)
      app.alertSuccess('Privileges copied!')
    })
  }

  Modmin.copyPrivilegesFromCategory = function () {
    categorySelector.modal(ajaxify.data.categories.slice(1), function (fromCid) {
      socket.emit('plugins.modmin.categories.copyPrivilegesFrom', { toCid: cid, fromCid: fromCid }, function (err) {
        if (err) {
          return app.alertError(err.message)
        }
        ajaxify.refresh()
      })
    })
  }

  Modmin.addSubcategory = function () {
    let modal = showCategoryModal('Add Subcategory', 'addSubcategory', function (err, cid) {
      if (err) {
        return app.alertError(err.message)
      }
      app.alertSuccess('Subcategory added!')
      ajaxify.refresh()
    })

    modal.on('shown.bs.modal', function () {
      modal.find('#category-color').val('#ec0000')
      modal.find('#category-bgColor').val('#ffffff')
      modal.find('#category-group').prop('checked', true)
      modal.find('#category-badge').prop('checked', true)

      autocomplete.user(modal.find('#category-owner'))
      modal.find('#category-icon i').addClass('fa-group')
      .prop('value', 'fa-group')
      modal.find('#category-icon').click(() => {
        iconSelect.init($(this).find('i'), (el) => {})
      })
    })
  }

  Modmin.editCategory = function () {
    if (!cid) return

    $.get(config.relative_path + '/api/category/' + cid, function (data) {
      if (!data) return app.alertError('Error retrieving category data.')

      let modal = showCategoryModal('Edit Category', 'editCategory', function (err) {
        if (err) {
          return app.alertError(err.message)
        }
        app.alertSuccess('Category edited!')
      })

      modal.on('shown.bs.modal', function () {
        modal.find('#category-name').val($($.parseHTML(data.name)[0]).text())
        modal.find('#category-description').val($($.parseHTML(data.description)[0]).text())
        modal.find('#category-color').val(data.color)
        modal.find('#category-bgColor').val(data.bgColor)
        modal.find('#category-icon i').addClass(data.icon)
        modal.find('#category-icon i').val(data.icon)
        modal.find('#category-icon').click(() => {
          iconSelect.init($(this).find('i'), (el) => {})
        })
      })
    })
  }

  function showCategoryModal (title, event, callback) {
    let modal = bootbox.confirm({
      title: title,
      message: `
      <form class="form" id="category-modal">
        <div class="row">
          <div class="col-sm-6 col-xs-12">
            <label for="category-name">Category Name</label>
            <input id="category-name" type="text" class="form-control" placeholder="" data-name="name" value="" /><br />
          </div>
          <div class="col-sm-6 col-xs-12">
            <label for="category-description">Category Description</label>
            <input id="category-description" type="text" class="form-control category_description description" data-name="description" placeholder="" value="" /><br />
          </div>
          <div class="col-sm-6 col-xs-12">
            <div class="form-group">
              <label for="category-bgColor">Background Color</label>
              <input id="category-bgColor" type="color" data-name="bgColor" class="form-control category_bgColor" />
            </div>
          </div>
          <div class="col-sm-6 col-xs-12">
            <div class="form-group">
              <label for="category-color">Text Color</label>
              <input id="category-color" type="color" data-name="color" class="form-control category_color" />
            </div>
          </div>
          <div class="col-sm-6 col-xs-12">
            <div class="form-group">
              <label for="category-icon">Category Icon</label>
              <div id="category-icon" class="btn btn-default" style="display:block;">
                <i class="fa fa-fw"></i>
              </div>
            </div>
          </div>
      ` + (event === 'addSubcategory' ? ($('[data-isGroupAssigner="true"]').length ? `
          <div class="col-sm-6 col-xs-12">
            <div class="checkbox">
              <label for="category-group">
                <input id="category-group" type="checkbox"> Assign Group <small>Will make the category only accessable by this group.</small>
              </label>
            </div>
          </div>
          <div class="col-sm-6 col-xs-12">
            <div class="checkbox">
              <label for="category-badge">
                <input id="category-badge" type="checkbox"> Show Badge <small>Badge setting for assigned group.</small>
              </label>
            </div>
          </div>
          ` : '') + `
          <div class="col-sm-6 col-xs-12">
            <div class="form-group">
              <label for="category-owner">
                Assign Owner
                <small>If a user is selected, they will become a manager of the category and group.</small>
              </label>
              <input id="category-owner" type="text" placeholder="" data-name="color" class="form-control category_color" />
            </div>
          </div>` : '') + '</div></form>',
      confirm: {
        label: 'Confirm',
        className: 'btn-success',
      },
      cancel: {
        label: 'Cancel',
        className: 'btn-danger',
      },
      show: true,
      callback: function (result) {
        if (!result) return

        let name = modal.find('#category-name').val()
        let description = modal.find('#category-description').val()
        let color = modal.find('#category-color').val()
        let bgColor = modal.find('#category-bgColor').val()
        let group = modal.find('#category-group').prop('checked')
        let userTitleEnabled = modal.find('#category-badge').prop('checked')
        let owner = modal.find('#category-owner').val()
        let icon = modal.find('#category-icon i').val()

        if (owner) {
          $.get(config.relative_path + '/api/user/' + owner)
          .done(function (data, status) {
            if (status !== 'success') return app.alertError('Invalid Owner')
            owner = parseInt(data.uid, 10)
            if (!owner) return app.alertError('Invalid Owner')

            if (group) {
              $.get(config.relative_path + '/api/groups/' + name)
              .done(function (data, status) {
                if (data.slug) return app.alertError('Group already exists.')
                done()
              })
              .fail(function () {
                done()
              })
            } else {
              done()
            }
          })
          .fail(function () {
            app.alertError('Invalid Owner')
          })
        } else {
          done()
        }

        function done () {
          socket.emit('plugins.modmin.categories.' + event, {
            cid: cid,
            group: group,
            userTitleEnabled: userTitleEnabled,
            owner: owner,
            data: {
              name: name,
              description: description,
              color: color,
              bgColor: bgColor,
              icon: icon,
            },
          }, callback)
        }
      },
    })

    return modal
  }

  Modmin.addGroup = function () {
    bootbox.prompt('Group Name', (name) => {
      socket.emit('plugins.modmin.categories.addGroup', {
        cid,
        name,
      }, (err) => {
        if (err) {
          app.alertError(err.message)
        } else {
          app.alertSuccess('Group created!')
          ajaxify.refresh()
        }
      })
    })
  }

  return Modmin
})
