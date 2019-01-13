<div class="row" id="modmin" data-cid="{cid}">
  <div class="h2">Manage Categories</div>

	<form role="form" class="category">
		<div>
			<p>
				You can configure the privileges and settings for categories on this page. Privileges can be granted on a per-user or a per-group basis. Select the category from the dropdown below.
			</p>

			<div class="lead">
				Configuring settings for
				<!-- IMPORT partials/category-selector.tpl -->
			</div>

			<hr />

      <div class="btn-toolbar">
        <button type="button" class="btn btn-info" data-ajaxify="false" data-action="editCategory">
          Edit Category
        </button>
        <button type="button" class="btn btn-primary" data-ajaxify="false" data-action="addSubcategory" data-isGroupAssigner="{isGroupAssigner}">
          Create Subcategory
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
