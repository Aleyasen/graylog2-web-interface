/**
 * This file is part of Graylog.
 *
 * Graylog is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Graylog is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Graylog.  If not, see <http://www.gnu.org/licenses/>.
 */
package controllers;

import com.google.inject.Inject;
import lib.BreadcrumbList;
import lib.security.RestPermissions;
import org.graylog2.restclient.lib.APIException;
import org.graylog2.restclient.lib.ApiClient;
import org.graylog2.restclient.models.Startpage;
import org.graylog2.restclient.models.User;
import org.graylog2.restclient.models.dashboards.Dashboard;
import org.graylog2.restclient.models.dashboards.DashboardService;
import play.mvc.Result;

import java.io.IOException;

import static views.helpers.Permissions.isPermitted;

public class DashboardsController extends AuthenticatedController {
    @Inject
    private DashboardService dashboardService;

    public Result index() {
        return ok(views.html.dashboards.index.render(currentUser()));
    }

    public Result show(String id) {
        final User currentUser = currentUser();

        if (!isPermitted(RestPermissions.DASHBOARDS_READ, id)) {
            return redirect(routes.DashboardsController.index());
        }

        try {
            Dashboard dashboard = dashboardService.get(id);

            final BreadcrumbList bc = new BreadcrumbList();
            bc.addCrumb("Dashboards", routes.DashboardsController.index());
            bc.addCrumb(dashboard.getTitle(), routes.DashboardsController.show(dashboard.getId()));

            return ok(views.html.dashboards.show.render(currentUser, bc, dashboard));
        } catch (APIException e) {
            if (e.getHttpCode() == NOT_FOUND) {
                String msg = "The requested dashboard was deleted and no longer exists.";
                final Startpage startpage = currentUser.getStartpage();
                if (startpage != null) {
                    if (new Startpage(Startpage.Type.DASHBOARD, id).equals(startpage)) {
                        msg += " Please reset your startpage.";
                    }
                }
                flash("error", msg);
                return redirect(routes.DashboardsController.index());
            }
            String message = "Could not get dashboard. We expected HTTP 200, but got a HTTP " + e.getHttpCode() + ".";
            return status(504, views.html.errors.error.render(message, e, request()));
        } catch (IOException e) {
            return status(504, views.html.errors.error.render(ApiClient.ERROR_MSG_IO, e, request()));
        }
    }
}
