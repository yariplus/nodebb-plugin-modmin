<div class="row">
  <div class="h2">[[modmin:config_title]]</div>

	<form role="form" id="modmin">
		<div>
			<p>[[modmin:config_intro]]</p>

      <hr />

			<div class="privilege-table-container">
				<table class="table table-striped privilege-table">
						<thead>
							<tr class="privilege-table-header">
								<th colspan="2"></th>
								<th class="arrowed" colspan="3">
									[[admin/manage/categories:privileges.section-viewing]]
								</th>
								<th class="arrowed" colspan="9">
									[[admin/manage/categories:privileges.section-posting]]
								</th>
								<th class="arrowed" colspan="3">
									[[admin/manage/categories:privileges.section-moderation]]
								</th>
							</tr><tr><!-- zebrastripe reset --></tr>
							<tr>
								<!-- BEGIN PrivilegesLabels -->
								<th class="text-center">{PrivilegesLabels.name}</th>
								<!-- END PrivilegesLabels -->
							</tr>
						</thead>
						<tbody>
							<tr>
                <!-- BEGIN userPrivileges -->
								<td>
									<input type="checkbox" data-key="@value">
								</td>
                <!-- END userPrivileges -->
							</tr>
						</tbody>
				</table>
				<h1><input type="checkbox" data-key="manage-groups"> [[modmin:config_groups]]</h1>
				<table class="table table-striped privilege-table">
						<thead>
							<tr class="privilege-table-header">
								<th colspan="2"></th>
								<th class="arrowed" colspan="3">
									[[admin/manage/categories:privileges.section-viewing]]
								</th>
								<th class="arrowed" colspan="9">
									[[admin/manage/categories:privileges.section-posting]]
								</th>
								<th class="arrowed" colspan="3">
									[[admin/manage/categories:privileges.section-moderation]]
								</th>
							</tr><tr><!-- zebrastripe reset --></tr>
							<tr>
								<!-- BEGIN PrivilegesLabels -->
								<th class="text-center">{PrivilegesLabels.name}</th>
								<!-- END PrivilegesLabels -->
							</tr>
						</thead>
						<tbody>
							<tr>
                <!-- BEGIN groupPrivileges -->
								<td>
									<input type="checkbox" data-key="@value">
								</td>
                <!-- END groupPrivileges -->
							</tr>
						</tbody>
			</table>
			<h1><input type="checkbox" data-key="delete-or-disable"> [[modmin:config_delete_or_disable]]</h1>
			<h1>[[modmin:config_global_settings]]</h1>
			<h5><input type="checkbox" data-key="disable-on-creation"> [[modmin:config_disable_on_creation]]</h5>
			<h5><input type="checkbox" data-key="force-group"> [[modmin:config_force_group]]</h5>
			<h5><input type="checkbox" data-key="force-group-title"> [[modmin:config_force_group_title]]</h5>
			<h5><input type="checkbox" data-key="rescind-defaults"> [[modmin:config_rescind_defaults]]</h5>
			<h5><input type="checkbox" data-key="force-owner"> [[modmin:config_force_owner]]</h5>
			</div>
		</div>
	</form>
</div>

<script>
require(['settings'], function (settings) {
  var wrapper = $('#modmin')
  settings.sync('modmin', wrapper)

  $('input').click(function(event) {
    settings.persist('modmin', wrapper, function () {
      socket.emit('admin.settings.syncModmin')
    })
  })
})
</script>
