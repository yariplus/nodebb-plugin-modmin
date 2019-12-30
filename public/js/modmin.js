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
    if ($(location).attr('hash')=="#addCategory") {
      Modmin.addCategory();
    }
  }

  Modmin.setupPrivilegeTable = function () {
    handlePrivChanges()

    $('[data-action="addSubcategory"]').click(Modmin.addSubcategory)
    $('[data-action="editCategory"]').click(Modmin.editCategory)
    $('[data-action="addGroup"]').click(Modmin.addGroup)
    $('[data-action="deleteCategory"]').click(Modmin.deleteCategory)
    $('[data-action="addCategory"]').click(Modmin.addCategory)
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

  function handlePrivChanges() {
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
        // Modmin.refreshPrivilegeTable()
        ajaxify.refresh()
        return app.alertError(err.message)
      }

      checkboxEl.replaceWith('<i class="fa fa-spin fa-spinner"></i>')
      // Modmin.refreshPrivilegeTable()
      ajaxify.refresh()
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

          modal.modal('hide')
          // Modmin.refreshPrivilegeTable()
          ajaxify.refresh()
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

          modal.modal('hide')
          // Modmin.refreshPrivilegeTable()
          ajaxify.refresh()
        })
      })
    })
  }

  Modmin.copyPrivilegesToChildren = function () {
    socket.emit('plugins.modmin.categories.copyPrivilegesToChildren', {cid: cid}, function (err) {
      if (err) return app.alertError(err.message)
      app.alertSuccess('[[modmin:privileges_copied]]')
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
    Benchpress.parse('modmin/edit_category', {
      addSubcategory: true,
      isGroupAssigner: !!$('[data-isGroupAssigner="true"]').length,
    }, function (html) {
      translator.translate(html, function (html) {
        let modal = showCategoryModal('[[modmin:new_subcategory]]', 'addSubcategory', html, function (err, cid) {
          if (err) return app.alertError(err.message)
          app.alertSuccess('[[modmin:subcategory_added]]')
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
      })
    })
  }

  Modmin.addCategory = function () {
    Benchpress.parse('modmin/edit_category', {
      addSubcategory: true,
      isGroupAssigner: !!$('[data-isGroupAssigner="true"]').length,
      forceOwner: !!$('[data-forceOwner="true"]').length,
    }, function (html) {
      translator.translate(html, function (html) {
        let modal = showCategoryModal('[[modmin:add_category]]', 'addCategory', html, function (err, data) {
          if (err) return app.alertError(err.message)
          app.alertSuccess('[[modmin:category_added]]'+ (!!data.disabled ? ' [[modmin:awaiting_approval]]' : ''))
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
      })
    })
  }

  Modmin.editCategory = function () {
    if (!cid) return

    $.get(config.relative_path + '/api/category/' + cid, function (data) {
      if (!data) return app.alertError('[[modmin:error_data]]')

      Benchpress.parse('modmin/edit_category', {
        addSubcategory: true,
        isGroupAssigner: !!$('[data-isGroupAssigner="true"]').length,
      }, function (html) {
        let modal = showCategoryModal('[[modmin:edit_category]]', 'editCategory', html, function (err) {
          if (err) return app.alertError(err.message)
          app.alertSuccess('[[modmin:category_edited]]')
          ajaxify.refresh()
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
    })
  }

  function showCategoryModal (title, event, html, callback) {
    let modal = bootbox.confirm({
      title: title,
      message: html,
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
            if (status !== 'success') return app.alertError('[[modmin:invalid_owner]]')
            owner = parseInt(data.uid, 10)
            if (!owner) return app.alertError('[[modmin:invalid_owner]]')

            if (group) {
              $.get(config.relative_path + '/api/groups/' + name)
              .done(function (data, status) {
                if (data.slug) return app.alertError('[[modmin:group_exists]]')
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
            app.alertError('[[modmin:invalid_owner]]')
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
    socket.emit('plugins.modmin.categories.addGroup', {
      cid,
    }, (err) => {
      if (err) {
        app.alertError(err.message)
      } else {
        app.alertSuccess('[[modmin:group_owned]]')
        ajaxify.refresh()
      }
    })
  }

  Modmin.deleteCategory = function () {
    let modal = bootbox.confirm("<div class='h2'>[[modmin:confirm_deletion]]</div>", function (result) {
      if (!result) return
      socket.emit('plugins.modmin.categories.deleteCategory', {
        cid: cid
      }, (err) => {
        if (err) {
          app.alertError(err.message)
        } else {
          app.alertSuccess('[[modmin:category_deleted]]')
          ajaxify.refresh()
        }
      })
    })
    return modal
  }

  return Modmin
})
