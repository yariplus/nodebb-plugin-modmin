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
