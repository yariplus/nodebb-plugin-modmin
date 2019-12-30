<div class="row" id="modmin" data-cid="{cid}">
  <div class="h2">[[modmin:title]]</div>

	<form role="form" class="category">
		<div>
			<p>[[modmin:intro]]</p>

			<div class="lead">
				Configuring settings for
				<!-- IMPORT partials/category-selector.tpl -->
			</div>

			<hr />

      <div class="btn-toolbar">
		<!-- IF isGlobal -->
		<button type="button" class="btn btn-info" data-ajaxify="false" data-action="addCategory" data-isGroupAssigner="{isGroupAssigner}" data-forceOwner="{forceOwner}">
			[[modmin:add_category]]
		</button>

		<!-- ELSE -->
        <button type="button" class="btn btn-info" data-ajaxify="false" data-action="editCategory">
          [[modmin:edit_category]]
        </button>

        <!-- IF isGroupAssigner -->
        <button type="button" class="btn btn-info" data-ajaxify="false" data-action="addGroup">
          [[modmin:become_group_owner]]
        </button>
        <!-- ENDIF isGroupAssigner -->

        <button type="button" class="btn btn-primary" data-ajaxify="false" data-action="addSubcategory" data-isGroupAssigner="{isGroupAssigner}">
          [[modmin:new_subcategory]]
		</button>
		
		<!-- IF canDelete -->
		<button type="button" class="btn btn-danger" data-ajaxify="false" data-action="deleteCategory">
			[[modmin:delete_category]]
		</button>
		<!-- ENDIF canDelete -->

		<!-- ENDIF isGlobal -->
      </div>

      <hr />

			<div class="privilege-table-container">
				<!-- IF cid -->
				<!-- IMPORT admin/partials/categories/privileges.tpl -->
				<!-- ELSE -->
				<!-- IMPORT admin/partials/global/privileges.tpl -->
				<!-- ENDIF cid -->
			</div>
		</div>
	</form>
</div>
<!-- IF canManageGroups -->
<style>
.privilege-table:nth-child(2){
	display: none;
}
</style>
<!-- ENDIF canManageGroups -->
